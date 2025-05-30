"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Video, Square, Upload, Download, AlertTriangle, CheckCircle } from "lucide-react"
import { uploadToCloudinary, convertToBase64 } from "@/lib/cloudinary"
import { useToast } from "@/hooks/use-toast"

interface ScreenRecorderProps {
  onRecordingComplete: (videoUrl: string) => void
}

export function ScreenRecorder({ onRecordingComplete }: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const checkPermissions = async () => {
    try {
      // Check if the browser supports screen capture
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Screen recording is not supported in this browser")
      }

      // Test permissions by requesting access
      const testStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      // Stop the test stream immediately
      testStream.getTracks().forEach((track) => track.stop())

      setPermissionError(null)
      return true
    } catch (error: any) {
      let errorMessage = "Screen recording permission denied"

      if (error.name === "NotAllowedError") {
        errorMessage = "Please allow screen recording permission and try again"
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Screen recording is not supported in this browser"
      } else if (error.message) {
        errorMessage = error.message
      }

      setPermissionError(errorMessage)
      return false
    }
  }

  const startRecording = async () => {
    try {
      setPermissionError(null)

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: "screen",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        if (!MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
          if (!MediaRecorder.isTypeSupported("video/webm")) {
            throw new Error("WebM recording is not supported in this browser")
          }
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm"

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setRecordingTime(0)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event.error)
        toast({
          title: "Recording Error",
          description: "An error occurred during recording",
          variant: "destructive",
        })
        stopRecording()
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      toast({
        title: "Recording started",
        description: "Screen recording is now active",
      })

      // Handle user stopping screen share
      stream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }
    } catch (error: any) {
      console.error("Screen recording error:", error)

      let errorMessage = "Failed to start screen recording"

      if (error.name === "NotAllowedError") {
        errorMessage = "Screen recording permission was denied. Please allow access and try again."
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Screen recording is not supported in this browser"
      } else if (error.name === "NotFoundError") {
        errorMessage = "No screen available for recording"
      } else if (error.message) {
        errorMessage = error.message
      }

      setPermissionError(errorMessage)
      toast({
        title: "Recording Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      toast({
        title: "Recording stopped",
        description: `Recording completed (${formatTime(recordingTime)})`,
      })
    }
  }

  const uploadRecording = async () => {
    if (!recordedBlob) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Create file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const file = new File([recordedBlob], `screen-recording-${timestamp}.webm`, {
        type: recordedBlob.type,
      })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 300)

      try {
        const videoUrl = await uploadToCloudinary(file, "recordings")
        clearInterval(progressInterval)
        setUploadProgress(100)

        toast({
          title: "Upload complete",
          description: "Your recording has been saved successfully",
        })

        onRecordingComplete(videoUrl)
      } catch (uploadError) {
        // Fallback to base64 if Cloudinary fails
        console.log("Cloudinary upload failed, using fallback:", uploadError)
        const base64Url = await convertToBase64(file)

        clearInterval(progressInterval)
        setUploadProgress(100)

        toast({
          title: "Recording saved locally",
          description: "Your recording has been saved (using fallback method)",
        })

        onRecordingComplete(base64Url)
      }

      // Reset state
      setRecordedBlob(null)
      setUploadProgress(0)
      setRecordingTime(0)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: "Failed to save recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadRecording = () => {
    if (!recordedBlob) return

    const url = URL.createObjectURL(recordedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `screen-recording-${new Date().toISOString().slice(0, 19)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download started",
      description: "Your recording is being downloaded",
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="w-5 h-5 mr-2" />
          Screen Recorder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}

        {!isRecording && !recordedBlob && (
          <div className="space-y-4">
            <Button onClick={checkPermissions} variant="outline" className="w-full">
              Test Permissions
            </Button>
            <Button onClick={startRecording} className="w-full" disabled={!!permissionError}>
              <Video className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording: {formatTime(recordingTime)}</span>
            </div>
            <Button onClick={stopRecording} variant="destructive" className="w-full">
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          </div>
        )}

        {recordedBlob && !uploading && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Recording completed successfully! Duration: {formatTime(recordingTime)}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={uploadRecording} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload to Cloud
              </Button>
              <Button onClick={downloadRecording} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading recording...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
