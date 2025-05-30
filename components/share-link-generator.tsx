"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Share, Copy, CheckCircle, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface ShareLinkGeneratorProps {
  demoId: string
  onLinkGenerated: (link: string) => void
}

export function ShareLinkGenerator({ demoId, onLinkGenerated }: ShareLinkGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [shareLink, setShareLink] = useState("")
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiryDays, setExpiryDays] = useState("7")
  const [hasViewLimit, setHasViewLimit] = useState(false)
  const [maxViews, setMaxViews] = useState("100")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const generateShareLink = async () => {
    setGenerating(true)
    setError(null)

    try {
      // Generate a secure random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      const expiresAt = hasExpiry
        ? new Date(Date.now() + Number.parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString()
        : null

      const shareLinkData = {
        demo_id: demoId,
        token,
        expires_at: expiresAt,
        is_active: true,
        max_views: hasViewLimit ? Number.parseInt(maxViews) : null,
        view_count: 0,
      }

      const { data, error: insertError } = await supabase.from("share_links").insert([shareLinkData]).select().single()

      if (insertError) {
        console.error("Share link creation error:", insertError)
        throw new Error(insertError.message || "Failed to create share link")
      }

      const link = `${window.location.origin}/shared/${token}`
      setShareLink(link)
      onLinkGenerated(link)

      toast({
        title: "Share link generated",
        description: "Your demo can now be shared with this link",
      })
    } catch (error: any) {
      console.error("Share link generation error:", error)
      const errorMessage = error.message || "Failed to generate share link"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      })
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = shareLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)

      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      })
    }
  }

  const resetForm = () => {
    setShareLink("")
    setError(null)
    setHasExpiry(false)
    setHasViewLimit(false)
    setExpiryDays("7")
    setMaxViews("100")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Share className="w-5 h-5 mr-2" />
          Generate Share Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!shareLink ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="expiry" checked={hasExpiry} onCheckedChange={setHasExpiry} />
              <Label htmlFor="expiry">Set expiration date</Label>
            </div>

            {hasExpiry && (
              <div>
                <Label>Expires in</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch id="viewLimit" checked={hasViewLimit} onCheckedChange={setHasViewLimit} />
              <Label htmlFor="viewLimit">Limit number of views</Label>
            </div>

            {hasViewLimit && (
              <div>
                <Label>Maximum views</Label>
                <Select value={maxViews} onValueChange={setMaxViews}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 views</SelectItem>
                    <SelectItem value="50">50 views</SelectItem>
                    <SelectItem value="100">100 views</SelectItem>
                    <SelectItem value="500">500 views</SelectItem>
                    <SelectItem value="1000">1000 views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={generateShareLink} disabled={generating} className="w-full">
              {generating ? "Generating..." : "Generate Share Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Share link generated successfully!
                {hasExpiry && ` Expires in ${expiryDays} day(s).`}
                {hasViewLimit && ` Limited to ${maxViews} views.`}
              </AlertDescription>
            </Alert>

            <div>
              <Label>Share Link</Label>
              <div className="flex space-x-2">
                <Input value={shareLink} readOnly className="font-mono text-sm" />
                <Button onClick={copyToClipboard} size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button onClick={resetForm} variant="outline" className="w-full">
              Generate Another Link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
