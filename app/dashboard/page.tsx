"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { supabase, type Demo } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Share, Settings, LogOut, Eye, Clock, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function DashboardPage() {
  const { user, profile, signOut, loading } = useAuth()
  const [demos, setDemos] = useState<Demo[]>([])
  const [loadingDemos, setLoadingDemos] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"demos" | "analytics">("demos")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDemos()
    }
  }, [user])

  const fetchDemos = async () => {
    const { data, error } = await supabase
      .from("demos")
      .select("*")
      .eq("owner_id", user?.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch demos",
        variant: "destructive",
      })
    } else {
      setDemos(data || [])
    }
    setLoadingDemos(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const createNewDemo = async () => {
    const { data, error } = await supabase
      .from("demos")
      .insert([
        {
          title: "Untitled Demo",
          description: "",
          owner_id: user?.id,
          is_public: true, // Make demos public by default
        },
      ])
      .select()
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create demo",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Demo created",
        description: "Your demo is publicly accessible and ready to edit!",
      })
      router.push(`/editor/${data.id}`)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DemoFlow
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {profile?.full_name || profile?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Demos</p>
                  <p className="text-2xl font-bold">{demos.length}</p>
                </div>
                <Play className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold">1,234</p>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                  <p className="text-2xl font-bold">2:34</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                  <p className="text-2xl font-bold">892</p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header with Create Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <Button variant={activeTab === "demos" ? "default" : "outline"} onClick={() => setActiveTab("demos")}>
              Your Demos
            </Button>
            <Button
              variant={activeTab === "analytics" ? "default" : "outline"}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </Button>
          </div>
          {activeTab === "demos" && (
            <Button onClick={createNewDemo} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Create New Demo
            </Button>
          )}
        </div>

        {/* Demos Grid */}
        {activeTab === "demos" ? (
          loadingDemos ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : demos.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No demos yet</h3>
                <p className="text-gray-600 mb-4">Create your first interactive product demo to get started.</p>
                <Button onClick={createNewDemo} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Demo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demos.map((demo) => (
                <Card key={demo.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg truncate">{demo.title}</h3>
                      <Badge variant={demo.is_public ? "default" : "secondary"}>
                        {demo.is_public ? "Public" : "Private"}
                      </Badge>
                    </div>

                    {demo.description && <p className="text-gray-600 text-sm mb-4 line-clamp-2">{demo.description}</p>}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{new Date(demo.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          🌍 Public
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/editor/${demo.id}`}>
                          <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/demo/${demo.id}`
                            navigator.clipboard.writeText(url)
                            toast({
                              title: "Link copied",
                              description: "Demo link copied to clipboard - anyone can view this!",
                            })
                          }}
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                        <Link href={`/demo/${demo.id}`}>
                          <Button size="sm">
                            <Play className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <AnalyticsDashboard userId={user.id!} />
        )}
      </div>
    </div>
  )
}
