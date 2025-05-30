"use client"

import { useEffect, useState, useRef } from "react"
import { supabase, type Demo, type DemoStep } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Eye, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AnalyticsService } from "@/lib/analytics"

interface SharedDemoViewerProps {
  params: {
    token: string
  }
}

export default function SharedDemoViewer({ params }: SharedDemoViewerProps) {
  const [demo, setDemo] = useState<Demo | null>(null)
  const [steps, setSteps] = useState<DemoStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<any>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const startTimeRef = useRef(Date.now())
  const lastUpdateRef = useRef(Date.now())
  const { toast } = useToast()

  useEffect(() => {
    validateAndFetchDemo()
  }, [params.token])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && steps.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            trackCompletion()
            return prev
          }
          return prev + 1
        })
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, steps.length])

  // Track time spent periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewId) {
        updateViewProgress()
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [viewId, currentStep])

  const validateAndFetchDemo = async () => {
    try {
      // Validate share link
      const { data: linkData, error: linkError } = await supabase
        .from("share_links")
        .select("*")
        .eq("token", params.token)
        .eq("is_active", true)
        .single()

      if (linkError || !linkData) {
        setError("Invalid or expired share link")
        setLoading(false)
        return
      }

      // Check if link has expired
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError("This share link has expired")
        setLoading(false)
        return
      }

      // Check view limit
      if (linkData.max_views && linkData.view_count >= linkData.max_views) {
        setError("This share link has reached its view limit")
        setLoading(false)
        return
      }

      setShareLink(linkData)

      // Fetch demo
      const { data: demoData, error: demoError } = await supabase
        .from("demos")
        .select("*")
        .eq("id", linkData.demo_id)
        .single()

      if (demoError || !demoData) {
        setError("Demo not found")
        setLoading(false)
        return
      }

      setDemo(demoData)

      // Fetch steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("demo_steps")
        .select("*")
        .eq("demo_id", linkData.demo_id)
        .order("order_index", { ascending: true })

      if (!stepsError) {
        setSteps(stepsData || [])
      }

      // Track view and increment share link counter
      await trackView(linkData)
    } catch (error) {
      console.error("Demo loading error:", error)
      setError("Failed to load demo")
    } finally {
      setLoading(false)
    }
  }

  const trackView = async (linkData: any) => {
    try {
      // Increment view count on share link
      const { error: updateError } = await supabase
        .from("share_links")
        .update({ view_count: (linkData.view_count || 0) + 1 })
        .eq("id", linkData.id)

      if (updateError) {
        console.error("Failed to update share link view count:", updateError)
      }

      // Track detailed view
      const viewData = await AnalyticsService.trackView(linkData.demo_id, linkData.id, {
        totalSteps: steps.length,
        ip: "unknown", // In production, get from headers
        location: null,
      })

      if (viewData) {
        setViewId(viewData.id)
      }
    } catch (error) {
      console.error("Failed to track view:", error)
    }
  }

  const updateViewProgress = async () => {
    if (!viewId) return

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000)
    await AnalyticsService.updateViewProgress(viewId, timeSpent, currentStep + 1)
    lastUpdateRef.current = Date.now()
  }

  const trackCompletion = async () => {
    if (!viewId) return

    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000)
    await AnalyticsService.updateViewProgress(viewId, timeSpent, steps.length)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      updateViewProgress()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      updateViewProgress()
    }
  }

  const restart = () => {
    setCurrentStep(0)
    setIsPlaying(false)
    startTimeRef.current = Date.now()
    updateViewProgress()
  }

  // Update progress when component unmounts
  useEffect(() => {
    return () => {
      if (viewId) {
        updateViewProgress()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="text-center p-8 bg-gray-800 border-gray-700 max-w-md">
          <CardContent>
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4 text-white">{error}</h1>
            <p className="text-gray-400">Please check the link and try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!demo || steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="text-center p-8 bg-gray-800 border-gray-700">
          <CardContent>
            <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">No content available</h2>
            <p className="text-gray-400">This demo doesn't have any steps yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStepData = steps[currentStep]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">{demo.title}</h1>
            {demo.description && <p className="text-gray-400 text-sm">{demo.description}</p>}
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            {shareLink?.max_views && (
              <Badge variant="outline">
                {shareLink.view_count}/{shareLink.max_views} views
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Content */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardContent className="p-8">
              {currentStepData?.image_url && (
                <div className="mb-6">
                  <img
                    src={currentStepData.image_url || "/placeholder.svg"}
                    alt={currentStepData.title || "Demo step"}
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}

              {currentStepData?.title && <h2 className="text-2xl font-bold mb-4">{currentStepData.title}</h2>}

              {currentStepData?.description && (
                <p className="text-gray-300 text-lg leading-relaxed">{currentStepData.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" onClick={restart} disabled={currentStep === 0 && !isPlaying}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>

            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={currentStep >= steps.length - 1 && !isPlaying}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {currentStep >= steps.length - 1 ? "Finished" : "Play"}
                </>
              )}
            </Button>

            <Button variant="outline" onClick={nextStep} disabled={currentStep >= steps.length - 1}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStep(index)
                  updateViewProgress()
                }}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  index === currentStep
                    ? "bg-blue-600 text-white"
                    : index < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {index + 1}. {step.title || `Step ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
