import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth-utils";
import type { EmergencyData } from "@/types";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const emergencyMutation = useMutation({
    mutationFn: async (data: EmergencyData) => {
      const token = getAuthToken();
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to activate emergency services');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "🚨 Emergency Activated",
        description: "Emergency services have been contacted. Help is on the way!",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Emergency Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(3);
  };

  const sendSMSToEmergencyContact = (latitude: number, longitude: number) => {
    if (!user?.emergencyContact) {
      toast({
        title: "No emergency contact",
        description: "Please set up an emergency contact in your profile.",
        variant: "destructive",
      });
      return false;
    }

    const message = `🚨 EMERGENCY ALERT 🚨\n\nI need immediate help!\n\nMy current location:\nhttps://maps.google.com/maps?q=${latitude},${longitude}\n\nLat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}\n\nPlease contact emergency services and come to my location immediately!\n\n- Sent from Kavach Safety App`;

    // Try multiple methods to send SMS
    const smsUrl = `sms:${user.emergencyContact}?body=${encodeURIComponent(message)}`;

    try {
      // Method 1: Try creating a link and clicking it
      const link = document.createElement('a');
      link.href = smsUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "📱 SMS App Opening",
        description: `Opening SMS to ${user.emergencyContact}`,
      });

      // Fallback: Also try window.location for better compatibility
      setTimeout(() => {
        try {
          window.location.href = smsUrl;
        } catch (fallbackError) {
          console.log('SMS fallback method failed:', fallbackError);
        }
      }, 500);

      return true;
    } catch (error) {
      console.error('SMS error:', error);

      // Show manual instructions
      toast({
        title: "📱 Manual SMS Required",
        description: `Please manually text ${user.emergencyContact}: "EMERGENCY - I need help at location ${latitude.toFixed(4)}, ${longitude.toFixed(4)}"`,
        variant: "destructive",
      });

      return false;
    }
  };

  const callEmergencyContact = () => {
    if (!user?.emergencyContact) {
      toast({
        title: "No emergency contact",
        description: "Please set up an emergency contact in your profile.",
        variant: "destructive",
      });
      return false;
    }

    const telUrl = `tel:${user.emergencyContact}`;

    try {
      // Method 1: Try creating a link and clicking it
      const link = document.createElement('a');
      link.href = telUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "📞 Calling Emergency Contact",
        description: `Initiating call to ${user.emergencyContact}`,
      });

      // Fallback: Also try window.location for better compatibility
      setTimeout(() => {
        try {
          window.location.href = telUrl;
        } catch (fallbackError) {
          console.log('Call fallback method failed:', fallbackError);
        }
      }, 1000);

      return true;
    } catch (error) {
      console.error('Call error:', error);

      // Show manual instructions
      toast({
        title: "📞 Manual Call Required",
        description: `Please manually call ${user.emergencyContact} immediately!`,
        variant: "destructive",
      });

      return false;
    }
  };

  const triggerEmergency = () => {
    console.log('🚨 Emergency triggered!');

    const executeEmergencyActions = (lat: number, lng: number) => {
      setCurrentLocation({ lat, lng });

      console.log(`📍 Location: ${lat}, ${lng}`);

      // Send SMS first
      console.log('📱 Attempting to send SMS...');
      const smsSuccess = sendSMSToEmergencyContact(lat, lng);

      // Make phone call after a delay
      setTimeout(() => {
        console.log('📞 Attempting to make call...');
        const callSuccess = callEmergencyContact();

        // If both SMS and call failed, show emergency instructions
        if (!smsSuccess && !callSuccess) {
          toast({
            title: "🚨 EMERGENCY - Manual Action Required",
            description: `Call ${user?.emergencyContact || 'emergency services'} NOW! Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            variant: "destructive",
          });
        }
      }, 3000); // Increased delay to 3 seconds

      // Also send to backend
      emergencyMutation.mutate({
        latitude: lat,
        longitude: lng,
      });
    };

    if (navigator.geolocation) {
      console.log('🌍 Getting current location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          console.log('✅ Location acquired:', lat, lng);
          executeEmergencyActions(lat, lng);
        },
        (error) => {
          console.log('❌ Geolocation failed:', error.message);
          // Use default location if geolocation fails
          const defaultLat = 28.6139;
          const defaultLng = 77.2090;
          console.log('📍 Using default location:', defaultLat, defaultLng);

          toast({
            title: "Location unavailable",
            description: "Using default location (Delhi). Please share your exact location manually.",
            variant: "destructive",
          });

          executeEmergencyActions(defaultLat, defaultLng);
        },
        {
          timeout: 10000, // 10 second timeout
          enableHighAccuracy: true,
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      );
    } else {
      console.log('❌ Geolocation not supported');
      const defaultLat = 28.6139;
      const defaultLng = 77.2090;

      toast({
        title: "Geolocation not supported",
        description: "Using default location. Please share your exact location manually.",
        variant: "destructive",
      });

      executeEmergencyActions(defaultLat, defaultLng);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isCountingDown && countdown === 0) {
      triggerEmergency();
      setIsCountingDown(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [countdown, isCountingDown]);

  const handleCancel = () => {
    setIsCountingDown(false);
    setCountdown(3);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4" aria-describedby="emergency-dialog-description">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency Alert</h2>

          {!isCountingDown ? (
            <>
              <p className="text-gray-600 mb-4">
                This will send your current location via SMS and call your emergency contact.
              </p>
              {user?.emergencyContact ? (
                <div className="bg-blue-50 p-3 rounded-lg mb-6">
                  <div className="flex items-center justify-center space-x-2 text-sm text-blue-800">
                    <Phone className="h-4 w-4" />
                    <span>Emergency Contact: {user.emergencyContact}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No emergency contact set. Please update your profile.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                    data-testid="button-cancel-emergency"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={startCountdown}
                    data-testid="button-confirm-emergency"
                  >
                    Activate Emergency
                  </Button>
                </div>

                {user?.emergencyContact && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.geolocation?.getCurrentPosition(
                          (pos) => sendSMSToEmergencyContact(pos.coords.latitude, pos.coords.longitude),
                          () => sendSMSToEmergencyContact(28.6139, 77.2090)
                        );
                      }}
                      data-testid="button-manual-sms"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Send SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={callEmergencyContact}
                      data-testid="button-manual-call"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call Now
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-2">Emergency will be activated in:</p>
              <div className="text-6xl font-bold text-red-600 mb-4" data-testid="text-countdown">
                {countdown}
              </div>
              <div className="bg-red-50 p-3 rounded-lg mb-6">
                <div className="flex items-center justify-center space-x-4 text-sm text-red-800">
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>SMS</span>
                  </div>
                  <span>→</span>
                  <div className="flex items-center space-x-1">
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  data-testid="button-cancel-countdown"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={triggerEmergency}
                  disabled={emergencyMutation.isPending}
                  data-testid="button-trigger-now"
                >
                  {emergencyMutation.isPending ? "Activating..." : "Activate Now"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
