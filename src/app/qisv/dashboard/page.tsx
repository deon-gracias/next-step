"use client";

import { QISVHeader } from "../_components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Demo data
const DEMO_STATS = {
  totalFacilities: 15,
  totalSurveys: 247,
  completedSurveys: 189,
  pendingSurveys: 58,
  averageScore: 78.5,
  pocRequired: 42,
  pocCompleted: 31,
};

const DEMO_RECENT_SURVEYS = [
  {
    id: 1234,
    facility: "Dexter House HealthCare",
    facilityCode: "1004",
    surveyor: "John Smith",
    date: "2025-09-29",
    score: 85,
    maxScore: 100,
    status: "completed",
    pocRequired: false,
  },
  {
    id: 1235,
    facility: "Fall River HealthCare",
    facilityCode: "1022",
    surveyor: "Sarah Johnson",
    date: "2025-09-28",
    score: 72,
    maxScore: 95,
    status: "poc_pending",
    pocRequired: true,
  },
  {
    id: 1236,
    facility: "Melrose HealthCare",
    facilityCode: "1009",
    surveyor: "Mike Wilson",
    date: "2025-09-27",
    score: 91,
    maxScore: 100,
    status: "completed",
    pocRequired: false,
  },
  {
    id: 1237,
    facility: "Garden Place HealthCare",
    facilityCode: "1006",
    surveyor: "Emily Davis",
    date: "2025-09-26",
    score: 68,
    maxScore: 90,
    status: "in_progress",
    pocRequired: false,
  },
  {
    id: 1238,
    facility: "Oakhill HealthCare",
    facilityCode: "1011",
    surveyor: "David Brown",
    date: "2025-09-25",
    score: 76,
    maxScore: 85,
    status: "poc_completed",
    pocRequired: true,
  },
];

const DEMO_PERFORMANCE_TRENDS = [
  { month: "May", score: 72, surveys: 18 },
  { month: "Jun", score: 75, surveys: 22 },
  { month: "Jul", score: 78, surveys: 25 },
  { month: "Aug", score: 76, surveys: 28 },
  { month: "Sep", score: 82, surveys: 31 },
];

const DEMO_FACILITY_RANKINGS = [
  { name: "Plymouth Harborside HealthCare", code: "1012", avgScore: 94.2, surveys: 12 },
  { name: "West Newton HealthCare", code: "1016", avgScore: 91.8, surveys: 8 },
  { name: "The Elmhurst HealthCare", code: "1013", avgScore: 89.5, surveys: 15 },
  { name: "Norwood HealthCare", code: "1010", avgScore: 87.3, surveys: 11 },
  { name: "Wedgemere HealthCare", code: "1015", avgScore: 84.7, surveys: 9 },
];

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const getStatusBadge = (status: string, pocRequired: boolean) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "poc_pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            POC Pending
          </Badge>
        );
      case "poc_completed":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <FileText className="w-3 h-3 mr-1" />
            POC Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Unknown
          </Badge>
        );
    }
  };

  const completionRate = Math.round((DEMO_STATS.completedSurveys / DEMO_STATS.totalSurveys) * 100);
  const pocCompletionRate = Math.round((DEMO_STATS.pocCompleted / DEMO_STATS.pocRequired) * 100);

  return (
    <>
      <QISVHeader crumbs={[{ label: "Dashboard" }]} />
      
      <main className="px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of survey performance and compliance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {currentTime.toLocaleTimeString()}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facilities</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEMO_STATS.totalFacilities}</div>
              <p className="text-xs text-muted-foreground">
                Active healthcare facilities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEMO_STATS.totalSurveys}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{DEMO_STATS.averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1 text-green-600" />
                <span className="text-green-600">+3.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Charts and Performance */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Survey Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Survey Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm">Completed</span>
                  </div>
                  <span className="font-medium">{DEMO_STATS.completedSurveys}</span>
                </div>
                <Progress value={(DEMO_STATS.completedSurveys / DEMO_STATS.totalSurveys) * 100} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="font-medium">{DEMO_STATS.pendingSurveys}</span>
                </div>
                <Progress value={(DEMO_STATS.pendingSurveys / DEMO_STATS.totalSurveys) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* POC Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Plan of Correction Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">{DEMO_STATS.pocRequired}</div>
                  <p className="text-sm text-muted-foreground">POCs Required</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-sm">Completed POCs</span>
                  </div>
                  <span className="font-medium">{DEMO_STATS.pocCompleted}</span>
                </div>
                <Progress value={pocCompletionRate} className="h-2" />

                <div className="text-center pt-2">
                  <Badge variant={pocCompletionRate >= 75 ? "default" : "destructive"}>
                    {pocCompletionRate}% Complete
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Trends (Last 5 Months)
              </div>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DEMO_PERFORMANCE_TRENDS.map((trend, index) => (
                <div key={trend.month} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium w-12">{trend.month}</div>
                    <div className="flex-1">
                      <Progress value={trend.score} className="h-2 w-32" />
                    </div>
                    <div className="text-sm font-medium">{trend.score}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trend.surveys} surveys
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Surveys */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Recent Surveys
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_RECENT_SURVEYS.map((survey) => (
                  <div key={survey.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{survey.facility}</div>
                      <div className="text-xs text-muted-foreground">
                        Code: {survey.facilityCode} • {survey.surveyor} • {survey.date}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {survey.score}/{survey.maxScore}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((survey.score / survey.maxScore) * 100)}%
                        </div>
                      </div>
                      {getStatusBadge(survey.status, survey.pocRequired)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Facilities */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Top Performing Facilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_FACILITY_RANKINGS.map((facility, index) => (
                  <div key={facility.code} className="flex items-center space-x-3 p-2 rounded-lg">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-100 text-yellow-800" :
                      index === 1 ? "bg-gray-100 text-gray-800" :
                      index === 2 ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{facility.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Code: {facility.code} • {facility.surveys} surveys
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {facility.avgScore}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Action Items & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">Overdue POCs</span>
                </div>
                <p className="mt-2 text-sm text-red-700">
                  11 Plans of Correction are overdue and require immediate attention.
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-red-200 hover:bg-red-100">
                  Review POCs
                </Button>
              </div>

              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800">Pending Surveys</span>
                </div>
                <p className="mt-2 text-sm text-amber-700">
                  {DEMO_STATS.pendingSurveys} surveys are in progress and need completion.
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-amber-200 hover:bg-amber-100">
                  View Surveys
                </Button>
              </div>

              <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Recent Achievements</span>
                </div>
                <p className="mt-2 text-sm text-green-700">
                  3 facilities achieved 90%+ scores this month. Great work!
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-green-200 hover:bg-green-100">
                  Celebrate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
