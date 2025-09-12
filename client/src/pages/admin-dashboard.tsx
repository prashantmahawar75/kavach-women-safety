import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError, getAuthToken } from "@/lib/auth-utils";
import { Shield, LogOut, Download, MapPin, User as UserIcon } from "lucide-react";
import Map from "@/components/ui/map";
import type { Report, User, UnsafeZone } from "@shared/schema";

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState("reports");
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery<(Report & { user?: User })[]>({
    queryKey: ["/api/reports"],
    retry: false,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    enabled: selectedTab === "users",
  });

  const { data: zones = [], isLoading: zonesLoading, error: zonesError } = useQuery<UnsafeZone[]>({
    queryKey: ["/api/zones"],
    retry: false,
    enabled: selectedTab === "zones",
  });

  // Handle auth errors
  useEffect(() => {
    if ((reportsError && isUnauthorizedError(reportsError as Error)) ||
        (usersError && isUnauthorizedError(usersError as Error)) ||
        (zonesError && isUnauthorizedError(zonesError as Error))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        logout();
      }, 500);
    }
  }, [reportsError, usersError, zonesError, toast, logout]);

  const approveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const token = getAuthToken();
      const response = await fetch(`/api/reports/${reportId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve report');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report approved",
        description: "The report has been approved and a safety zone has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const token = getAuthToken();
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
    },
    onSuccess: () => {
      toast({
        title: "Report deleted",
        description: "The report has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = getAuthToken();
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: async (zoneData: { name: string; latitude: number; longitude: number; reportCount: number }) => {
      const token = getAuthToken();
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(zoneData),
      });

      if (!response.ok) {
        throw new Error('Failed to create zone');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Zone created",
        description: "The unsafe zone has been marked successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create zone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: string) => {
      const token = getAuthToken();
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete zone');
      }
    },
    onSuccess: () => {
      toast({
        title: "Zone deleted",
        description: "The unsafe zone has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete zone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMapClick = (lat: number, lng: number) => {
    const name = prompt("Enter zone name:");
    if (name) {
      createZoneMutation.mutate({
        name,
        latitude: lat,
        longitude: lng,
        reportCount: 0,
      });
    }
  };

  const exportReportsToCSV = () => {
    if (reports.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no reports to export.",
        variant: "destructive",
      });
      return;
    }

    // CSV headers
    const headers = [
      'Report ID',
      'User Name',
      'User Phone',
      'Location',
      'Incident Type',
      'Description',
      'Date & Time',
      'Status',
      'Anonymous',
      'Latitude',
      'Longitude',
      'Created At'
    ];

    // Convert reports to CSV rows
    const csvRows = reports.map(report => [
      report.id,
      report.anonymous ? 'Anonymous' : (report.user?.fullName || report.user?.username || 'Unknown'),
      report.anonymous ? 'N/A' : (report.user?.phone || 'N/A'),
      report.location,
      report.incidentType,
      report.description || 'N/A',
      report.datetime ? new Date(report.datetime).toLocaleString() : 'N/A',
      report.status || 'pending',
      report.anonymous ? 'Yes' : 'No',
      report.latitude || 'N/A',
      report.longitude || 'N/A',
      report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kavach-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `${reports.length} reports exported to CSV file.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                <h1 className="text-xl font-bold text-gray-900">Kavach Admin</h1>
                <p className="text-sm text-gray-600">Administrator Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" data-testid="button-admin-profile">
                <UserIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} data-testid="button-admin-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" data-testid="tab-reports">Reports Management</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            <TabsTrigger value="zones" data-testid="tab-zones">Zone Management</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Incident Reports</CardTitle>
                  <Button 
                    variant="outline" 
                    onClick={exportReportsToCSV}
                    disabled={reportsLoading || reports.length === 0}
                    data-testid="button-export-reports"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reports found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report: Report & { user?: User }) => (
                        <TableRow key={report.id} data-testid={`admin-report-${report.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid="text-user-name">
                                {report.anonymous ? 'Anonymous' : report.user?.fullName || report.user?.username || 'Unknown'}
                              </div>
                              {!report.anonymous && report.user?.phone && (
                                <div className="text-sm text-gray-500" data-testid="text-user-phone">
                                  {report.user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell data-testid="text-admin-report-location">{report.location}</TableCell>
                          <TableCell className="capitalize" data-testid="text-admin-report-type">{report.incidentType}</TableCell>
                          <TableCell data-testid="text-admin-report-date">
                            {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(report.status || 'pending')} data-testid="badge-admin-report-status">
                              {report.status || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-2">
                            {report.status === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => approveReportMutation.mutate(report.id)}
                                disabled={approveReportMutation.isPending}
                                data-testid={`button-approve-report-${report.id}`}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteReportMutation.mutate(report.id)}
                              disabled={deleteReportMutation.isPending}
                              data-testid={`button-delete-report-${report.id}`}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Emergency Contact</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: User) => (
                        <TableRow key={user.id} data-testid={`admin-user-${user.id}`}>
                          <TableCell>
                            <div className="font-medium" data-testid="text-admin-user-name">
                              {user.fullName || user.username}
                            </div>
                            <div className="text-sm text-gray-500" data-testid="text-admin-username">
                              @{user.username}
                            </div>
                          </TableCell>
                          <TableCell data-testid="text-admin-user-phone">{user.phone || 'N/A'}</TableCell>
                          <TableCell data-testid="text-admin-emergency-contact">{user.emergencyContact || 'N/A'}</TableCell>
                          <TableCell data-testid="text-admin-join-date">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown date'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zones Tab */}
          <TabsContent value="zones">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Zone Management</CardTitle>
                  <p className="text-sm text-gray-600">Click on the map to mark unsafe zones</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Map isAdmin={true} onMapClick={handleMapClick} />
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Marked Unsafe Zones</h3>
                    {zonesLoading ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Loading zones...</p>
                      </div>
                    ) : zones.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No zones marked yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {zones.map((zone: UnsafeZone) => (
                          <div 
                            key={zone.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            data-testid={`admin-zone-${zone.id}`}
                          >
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 ${
                                (zone.reportCount || 0) >= 15 ? 'bg-red-500' :
                                (zone.reportCount || 0) >= 6 ? 'bg-orange-500' :
                                (zone.reportCount || 0) >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              <div>
                                <p className="font-medium text-gray-900" data-testid="text-admin-zone-name">
                                  {zone.name}
                                </p>
                                <p className="text-sm text-gray-600" data-testid="text-admin-zone-reports">
                                  {zone.reportCount || 0} reports
                                </p>
                                <p className="text-sm text-gray-600" data-testid="text-admin-zone-coords">
                                  {Number(zone.latitude).toFixed(4)}, {Number(zone.longitude).toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteZoneMutation.mutate(zone.id)}
                              disabled={deleteZoneMutation.isPending}
                              data-testid={`button-delete-zone-${zone.id}`}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
