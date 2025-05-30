"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Users, Play, Eye, Shield, Search, Ban, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface AdminStats {
  totalUsers: number
  totalDemos: number
  totalViews: number
  activeUsers: number
}

interface UserData {
  id: string
  email: string
  full_name: string
  created_at: string
  last_login: string | null
  demo_count: number
  total_views: number
  status: "active" | "suspended"
}

export default function AdminDashboard() {
  const { user, profile, loading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/dashboard")
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (user && profile?.role === "admin") {
      fetchAdminData()
    }
  }, [user, profile])

  const fetchAdminData = async () => {
    try {
      // Generate mock admin data
      const mockStats: AdminStats = {
        totalUsers: 1247,
        totalDemos: 3891,
        totalViews: 45672,
        activeUsers: 892,
      }

      const mockUsers: UserData[] = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        full_name: `User ${i + 1}`,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_login:
          Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        demo_count: Math.floor(Math.random() * 20),
        total_views: Math.floor(Math.random() * 1000),
        status: Math.random() > 0.1 ? "active" : "suspended",
      }))

      setStats(mockStats)
      setUsers(mockUsers)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active"

    setUsers(
      users.map((user) => (user.id === userId ? { ...user, status: newStatus as "active" | "suspended" } : user)),
    )

    toast({
      title: "User status updated",
      description: `User has been ${newStatus}`,
    })
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || profile?.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="w-6 h-6 mr-2 text-red-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Manage users, demos, and platform analytics</p>
            </div>
            <Badge variant="destructive">Admin Access</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Demos</p>
                  <p className="text-2xl font-bold">{stats?.totalDemos.toLocaleString()}</p>
                </div>
                <Play className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold">{stats?.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">{stats?.activeUsers.toLocaleString()}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Platform Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsDashboard />
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Demos</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.demo_count}</TableCell>
                    <TableCell>{user.total_views.toLocaleString()}</TableCell>
                    <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={user.status === "active" ? "destructive" : "default"}
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === "active" ? (
                          <>
                            <Ban className="w-3 h-3 mr-1" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
