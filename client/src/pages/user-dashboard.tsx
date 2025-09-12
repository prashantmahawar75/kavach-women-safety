import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { Shield, Plus, LogOut, Moon, User as UserIcon } from "lucide-react";
import Map from "@/components/ui/map";
import EmergencyButton from "@/components/emergency-button";
import ReportModal from "@/components/report-modal";
import ZoneInfoModal from "@/components/zone-info-modal";
import ProfilePage from "@/pages/profile";
import type { MapZone } from "@/types";
import type { Report } from "@shared/schema";

export default function UserDashboard() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: reports = [], isLoading, error } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
    retry: false,
  });

  // Handle auth errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        logout();
      }, 500);
    }
  }, [error, toast, logout]);

  const handleZoneClick = (zone: MapZone) => {
    setSelectedZone(zone);
    setShowZoneModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show profile page if requested
  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Kavach</h1>
                <p className="text-sm text-gray-600" data-testid="text-welcome">
                  Welcome, {user?.fullName || user?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowProfile(true)}
                data-testid="button-profile"
              >
                <UserIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" data-testid="button-theme-toggle">
                <Moon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Safety Map - Left Side (Larger) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Safety Map</CardTitle>
              </CardHeader>
              <CardContent>
                <Map height="h-96" onZoneClick={handleZoneClick} />
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports - Right Side */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Your Reports</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowReportModal(true)}
                    data-testid="button-report-incident"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No reports submitted yet</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowReportModal(true)}
                  data-testid="button-first-report"
                >
                  Submit Your First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {reports.map((report: Report) => (
                  <div 
                    key={report.id} 
                    className="border rounded-lg p-3 bg-white"
                    data-testid={`report-${report.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 text-sm" data-testid="text-report-type">
                        {report.incidentType || 'Unknown type'}
                      </h4>
                      <Badge 
                        className={getStatusColor(report.status || 'pending')}
                        data-testid="badge-report-status"
                      >
                        {report.status || 'pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1" data-testid="text-report-location">
                      📍 {report.location}
                    </p>
                    <p className="text-xs text-gray-500" data-testid="text-report-date">
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                    {report.description && (
                      <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                        {report.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Emergency Button */}
      <EmergencyButton />

      {/* Modals */}
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
      />
      
      <ZoneInfoModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        zone={selectedZone}
      />
    </div>
  );
}
