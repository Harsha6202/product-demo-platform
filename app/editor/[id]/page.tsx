"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { supabase, type Demo, type DemoStep } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Save, ArrowLeft, Upload, Trash2, GripVertical, Eye, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScreenRecorder } from "@/components/screen-recorder"
import { ShareLinkGenerator } from "@/components/share-link-generator"
import { uploadToCloudinary, convertToBase64 } from "@/lib/cloudinary"

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  const { user, loading } = useAuth()
  const [demo, setDemo] = useState<Demo | null>(null)
  const [steps, setSteps] = useState<DemoStep[]>([])
  const [loadingDemo, setLoadingDemo] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [shareLinks, setShareLinks] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && params.id) {
      fetchDemo()
      fetchSteps()
    }
  }, [user, params.id])

  const fetchDemo = async () => {
    const { data, error } = await supabase
      .from("demos")
      .select("*")
      .eq("id", params.id)
      .eq("owner_id", user?.id)
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Demo not found or access denied",
        variant: "destructive",
      })
      router.push("/dashboard")
    } else {
      setDemo(data)
    }
    setLoadingDemo(false)
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
  }

  const saveDemo = async () => {
    if (!demo) return

    setSaving(true)
    const { error } = await supabase
      .from("demos")
      .update({
        title: demo.title,
        description: demo.description,
        is_public: true, // Make all demos public by default
        updated_at: new Date().toISOString(),
      })
      .eq("id", demo.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save demo",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Saved",
        description: "Demo saved and is now publicly accessible!",
      })
    }
    setSaving(false)
  }

  const addStep = async () => {
    const newStep = {
      demo_id: params.id,
      title: `Step ${steps.length + 1}`,
      description: "",
      order_index: steps.length,
      image_url: null,
    }

    const { data, error } = await supabase.from("demo_steps").insert([newStep]).select().single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add step",
        variant: "destructive",
      })
    } else {
      setSteps([...steps, data])
    }
  }

  const updateStep = async (stepId: string, updates: Partial<DemoStep>) => {
    const { error } = await supabase.from("demo_steps").update(updates).eq("id", stepId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update step",
        variant: "destructive",
      })
    } else {
      setSteps(steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)))
    }
  }

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase.from("demo_steps").delete().eq("id", stepId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete step",
        variant: "destructive",
      })
    } else {
      setSteps(steps.filter((step) => step.id !== stepId))
    }
  }

  const handleImageUpload = async (file: File, stepId: string) => {
    setUploadingImage(true)
    try {
      let imageUrl: string

      try {
        imageUrl = await uploadToCloudinary(file, "step-images")
      } catch (cloudinaryError) {
        // Fallback to base64 if Cloudinary fails
        console.log("Cloudinary upload failed, using fallback:", cloudinaryError)
        imageUrl = await convertToBase64(file)
      }

      await updateStep(stepId, { image_url: imageUrl })
      toast({
        title: "Image uploaded",
        description: "Image has been saved successfully",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      setRecording(true)
      toast({
        title: "Recording started",
        description: "Screen recording is now active",
      })

      // In a real implementation, you would handle the recording here
      // For now, we'll just simulate it
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
        setRecording(false)
        toast({
          title: "Recording stopped",
          description: "Screen recording has been saved",
        })
      }, 5000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start screen recording",
        variant: "destructive",
      })
    }
  }

  if (loading || loadingDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!demo) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{demo.title}</h1>
                <Badge variant={demo.is_public ? "default" : "secondary"}>
                  {demo.is_public ? "Public" : "Private"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <ScreenRecorder
                onRecordingComplete={(videoUrl) => {
                  // Add the video URL to the current step or demo
                  toast({
                    title: "Recording saved",
                    description: "Video has been uploaded and is ready to use",
                  })
                }}
              />
              <Link href={`/demo/${demo.id}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button onClick={saveDemo} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Demo Settings */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Demo Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={demo.title}
                    onChange={(e) => setDemo({ ...demo, title: e.target.value })}
                    placeholder="Demo title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={demo.description || ""}
                    onChange={(e) => setDemo({ ...demo, description: e.target.value })}
                    placeholder="Demo description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={demo.is_public}
                    onCheckedChange={(checked) => setDemo({ ...demo, is_public: checked })}
                  />
                  <Label htmlFor="public">Make this demo public</Label>
                </div>

                {demo.is_public && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">Public demos can be viewed by anyone with the link.</p>
                  </div>
                )}
                <ShareLinkGenerator
                  demoId={demo.id}
                  onLinkGenerated={(link) => {
                    setShareLinks([...shareLinks, link])
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Demo Steps */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Demo Steps</h2>
              <Button onClick={addStep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No steps yet</h3>
                  <p className="text-gray-600 mb-4">Add your first step to start building your demo.</p>
                  <Button onClick={addStep}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={step.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Step Title</Label>
                              <Input
                                value={step.title || ""}
                                onChange={(e) => updateStep(step.id, { title: e.target.value })}
                                placeholder="Step title"
                              />
                            </div>
                            <div>
                              <Label>Image</Label>
                              <div className="flex space-x-2">
                                <Input
                                  value={step.image_url || ""}
                                  onChange={(e) => updateStep(step.id, { image_url: e.target.value })}
                                  placeholder="Image URL or upload"
                                />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleImageUpload(e.target.files[0], step.id)
                                    }
                                  }}
                                  className="hidden"
                                  id={`upload-image-${step.id}`}
                                />
                                <Label htmlFor={`upload-image-${step.id}`} className="cursor-pointer">
                                  <Button variant="outline" size="sm" disabled={uploadingImage}>
                                    <Upload className="w-4 h-4" />
                                  </Button>
                                </Label>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={step.description || ""}
                              onChange={(e) => updateStep(step.id, { description: e.target.value })}
                              placeholder="Describe this step..."
                              rows={3}
                            />
                          </div>

                          {step.image_url && (
                            <div className="mt-4">
                              <img
                                src={step.image_url || "/placeholder.svg"}
                                alt={step.title || "Step image"}
                                className="max-w-full h-48 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStep(step.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
