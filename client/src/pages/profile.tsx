import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth-utils";
import { Shield, User, Phone, UserCheck, ArrowLeft, Save } from "lucide-react";

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100, "Full name is too long"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number is too long"),
  emergencyContact: z.string().min(10, "Emergency contact must be at least 10 digits").max(20, "Emergency contact is too long"),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      emergencyContact: user?.emergencyContact || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Updating profile with data:', data);
      
      try {
        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('Profile update error:', errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Profile update successful:', result);
        return result;
      } catch (networkError) {
        console.error('Network error during profile update:', networkError);
        if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to server. Please check your connection.');
        }
        throw networkError;
      }
    },
    onSuccess: (data) => {
      console.log('Profile update mutation success:', data);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      console.error('Profile update mutation error:', error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    console.log('Form submitted with data:', data);
    
    // Validate data before sending
    if (!data.fullName?.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.phone?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.emergencyContact?.trim()) {
      toast({
        title: "Validation Error",
        description: "Emergency contact is required", 
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      emergencyContact: user?.emergencyContact || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-4"
                data-testid="button-back-to-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Profile Settings</h1>
                  <p className="text-sm text-gray-600">Manage your account information</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-profile"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled
                    className="bg-gray-50"
                    data-testid="input-username"
                  />
                  <p className="text-sm text-gray-500 mt-1">Username cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    {...form.register("fullName")}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                    data-testid="input-fullname"
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register("phone")}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                    placeholder="+1234567890"
                    data-testid="input-phone"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emergencyContact" className="flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Emergency Contact
                  </Label>
                  <Input
                    id="emergencyContact"
                    type="tel"
                    {...form.register("emergencyContact")}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                    placeholder="+1234567890"
                    data-testid="input-emergency-contact"
                  />
                  {form.formState.errors.emergencyContact && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.emergencyContact.message}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    This contact will be notified during emergencies
                  </p>
                </div>

                {isEditing && (
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1"
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Account Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Account Type</span>
                  <span className="text-sm capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {user?.role || "user"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Member Since</span>
                  <span className="text-sm text-gray-900">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Emergency Contact Status</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    user?.emergencyContact 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {user?.emergencyContact ? "✓ Configured" : "⚠ Not Set"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle>Safety Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Always keep your emergency contact updated and reachable</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Test the emergency feature with your contact to ensure it works</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Keep your phone charged and location services enabled</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Report incidents promptly to help keep the community safe</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}