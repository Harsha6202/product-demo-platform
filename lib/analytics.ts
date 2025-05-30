import { supabase } from "./supabase"

export interface AnalyticsData {
  totalViews: number
  uniqueViewers: number
  avgTimeSpent: number
  completionRate: number
  viewsByDay: Array<{ date: string; views: number }>
  topDemos: Array<{ title: string; views: number; id: string }>
  deviceTypes: Array<{ name: string; value: number }>
  locations: Array<{ country: string; views: number }>
}

export class AnalyticsService {
  static async getUserAnalytics(userId: string, timeRange = "7d"): Promise<AnalyticsData> {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get user's demos
      const { data: demos } = await supabase.from("demos").select("id, title").eq("owner_id", userId)

      if (!demos || demos.length === 0) {
        return this.getEmptyAnalytics()
      }

      const demoIds = demos.map((d) => d.id)

      // Get total views
      const { data: views } = await supabase
        .from("demo_views")
        .select("*")
        .in("demo_id", demoIds)
        .gte("viewed_at", startDate.toISOString())

      // Calculate metrics
      const totalViews = views?.length || 0
      const uniqueViewers = new Set(views?.map((v) => v.viewer_ip)).size
      const avgTimeSpent = views?.reduce((acc, v) => acc + (v.time_spent || 0), 0) / (totalViews || 1)
      const completedViews = views?.filter((v) => v.completed_steps === v.total_steps).length || 0
      const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0

      // Views by day
      const viewsByDay = this.getViewsByDay(views || [], days)

      // Top demos
      const topDemos = this.getTopDemos(views || [], demos)

      // Device types (mock for now, would need user agent parsing)
      const deviceTypes = this.getDeviceTypes(views || [])

      // Locations (mock for now, would need IP geolocation)
      const locations = this.getLocations(views || [])

      return {
        totalViews,
        uniqueViewers,
        avgTimeSpent,
        completionRate,
        viewsByDay,
        topDemos,
        deviceTypes,
        locations,
      }
    } catch (error) {
      console.error("Analytics error:", error)
      return this.getEmptyAnalytics()
    }
  }

  static async getDemoAnalytics(demoId: string, timeRange = "7d"): Promise<AnalyticsData> {
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get demo views
      const { data: views } = await supabase
        .from("demo_views")
        .select("*")
        .eq("demo_id", demoId)
        .gte("viewed_at", startDate.toISOString())

      // Get demo info
      const { data: demo } = await supabase.from("demos").select("title").eq("id", demoId).single()

      const totalViews = views?.length || 0
      const uniqueViewers = new Set(views?.map((v) => v.viewer_ip)).size
      const avgTimeSpent = views?.reduce((acc, v) => acc + (v.time_spent || 0), 0) / (totalViews || 1)
      const completedViews = views?.filter((v) => v.completed_steps === v.total_steps).length || 0
      const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0

      const viewsByDay = this.getViewsByDay(views || [], days)
      const topDemos = demo ? [{ title: demo.title, views: totalViews, id: demoId }] : []
      const deviceTypes = this.getDeviceTypes(views || [])
      const locations = this.getLocations(views || [])

      return {
        totalViews,
        uniqueViewers,
        avgTimeSpent,
        completionRate,
        viewsByDay,
        topDemos,
        deviceTypes,
        locations,
      }
    } catch (error) {
      console.error("Demo analytics error:", error)
      return this.getEmptyAnalytics()
    }
  }

  static async trackView(demoId: string, shareLinkId?: string, viewerData?: any) {
    try {
      const viewRecord = {
        demo_id: demoId,
        share_link_id: shareLinkId || null,
        viewer_ip: viewerData?.ip || "unknown",
        viewer_location: viewerData?.location || null,
        viewed_at: new Date().toISOString(),
        time_spent: 0,
        completed_steps: 0,
        total_steps: viewerData?.totalSteps || 0,
      }

      const { data, error } = await supabase.from("demo_views").insert([viewRecord]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Track view error:", error)
      return null
    }
  }

  static async updateViewProgress(viewId: string, timeSpent: number, completedSteps: number) {
    try {
      const { error } = await supabase
        .from("demo_views")
        .update({
          time_spent: timeSpent,
          completed_steps: completedSteps,
        })
        .eq("id", viewId)

      if (error) throw error
    } catch (error) {
      console.error("Update view progress error:", error)
    }
  }

  private static getViewsByDay(views: any[], days: number) {
    const viewsByDay = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      const dayViews = views.filter((v) => v.viewed_at.startsWith(dateStr)).length

      viewsByDay.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        views: dayViews,
      })
    }
    return viewsByDay
  }

  private static getTopDemos(views: any[], demos: any[]) {
    const demoViewCounts = demos.map((demo) => ({
      title: demo.title,
      id: demo.id,
      views: views.filter((v) => v.demo_id === demo.id).length,
    }))

    return demoViewCounts.sort((a, b) => b.views - a.views).slice(0, 5)
  }

  private static getDeviceTypes(views: any[]) {
    // In a real implementation, you'd parse user agents
    // For now, return realistic mock data based on view count
    const total = views.length || 1
    return [
      { name: "Desktop", value: Math.round(total * 0.65) },
      { name: "Mobile", value: Math.round(total * 0.25) },
      { name: "Tablet", value: Math.round(total * 0.1) },
    ]
  }

  private static getLocations(views: any[]) {
    // In a real implementation, you'd use IP geolocation
    // For now, return mock data based on view patterns
    const countries = ["United States", "United Kingdom", "Germany", "France", "Canada"]
    return countries
      .map((country, index) => ({
        country,
        views: Math.floor((views.length || 0) * (0.3 - index * 0.05)),
      }))
      .filter((l) => l.views > 0)
  }

  private static getEmptyAnalytics(): AnalyticsData {
    return {
      totalViews: 0,
      uniqueViewers: 0,
      avgTimeSpent: 0,
      completionRate: 0,
      viewsByDay: [],
      topDemos: [],
      deviceTypes: [],
      locations: [],
    }
  }
}
