"use client"

import { useEffect, useState } from "react"
import { supabase, type Demo, type DemoStep } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Share, Eye, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DemoViewerProps {
  params: {
    id: string
  }
}

export default function DemoViewer({ params }: DemoViewerProps) {
  const [demo, setDemo] = useState<Demo | null>(null)
  const [steps, setSteps] = useState<DemoStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchDemo()
    fetchSteps()
    // Track view
    trackView()
  }, [params.id])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && steps.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 3000) // 3 seconds per step
    }
    return () => clearInterval(interval)
  }, [isPlaying, steps.length])

  const fetchDemo = async () => {
    // First try to get public demo
    const { data: publicDemo, error: publicError } = await supabase
      .from("demos")
      .select("*")
      .eq("id", params.id)
      .eq("is_public", true)
      .single()

    if (publicDemo) {
      setDemo(publicDemo)
      return
    }

    // If not public, check if user owns it
    const { data: privateDemo, error: privateError } = await supabase
      .from("demos")
      .select("*")
      .eq("id", params.id)
      .single()

    if (privateError) {
      toast({
        title: "Error",
        description: "Demo not found or access denied",
        variant: "destructive",
      })
    } else {
      setDemo(privateDemo)
    }
  }

  const fetchSteps = async () => {
    const { data, error } = await supabase
      .from("demo_steps")
      .select("*")
      .eq("demo_id", params.id)
      .order("order_index", { ascending: true })

    if (!error) {
      setSteps(data || [])
    }
    setLoading(false)
  }

  const trackView = async () => {
    // Simple view tracking without authentication required
    try {
      await supabase.from("demo_views").insert([
        {
          demo_id: params.id,
          viewer_ip: "anonymous",
          viewed_at: new Date().toISOString(),
          time_spent: 0,
          completed_steps: 0,
          total_steps: steps.length,
        },
      ])
    } catch (error) {
      // Silently fail - view tracking is not critical
      console.log("View tracking failed:", error)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const restart = () => {
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const shareDemo = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied",
        description: "Demo link copied to clipboard - anyone can view this demo!",
      })
    } catch (error) {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)

      toast({
        title: "Link copied",
        description: "Demo link copied to clipboard - anyone can view this demo!",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!demo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">Demo not found</h1>
            <p className="text-gray-600">This demo may be private or no longer exist.</p>
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
            <Badge variant="outline" className="text-green-400 border-green-400">
              Public Demo
            </Badge>
            <Button variant="outline" size="sm" onClick={shareDemo}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {steps.length === 0 ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="text-center p-8 bg-gray-800 border-gray-700">
            <CardContent>
              <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No steps available</h2>
              <p className="text-gray-400">This demo doesn't have any steps yet.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
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
                        crossOrigin="anonymous"
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
                    onClick={() => setCurrentStep(index)}
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

              {/* Share Section */}
              <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-400">🌍 This demo is publicly accessible!</h3>
                    <p className="text-sm text-gray-400">Anyone with this link can view this demo</p>
                  </div>
                  <Button onClick={shareDemo} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  )
}
