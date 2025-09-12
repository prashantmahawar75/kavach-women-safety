import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/auth-utils";
import { MapPin } from "lucide-react";

const reportSchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  datetime: z.string().min(1, "Date and time is required"),
  anonymous: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type ReportForm = z.infer<typeof reportSchema>;

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      incidentType: "",
      location: "",
      description: "",
      datetime: "",
      anonymous: false,
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (data: ReportForm) => {
      const token = getAuthToken();
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping make our community safer.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);
        form.setValue("location", `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setIsGettingLocation(false);
        toast({
          title: "Location acquired",
          description: "Current location has been set.",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location error",
          description: "Failed to get current location.",
          variant: "destructive",
        });
      }
    );
  };

  const onSubmit = (data: ReportForm) => {
    reportMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto" aria-describedby="report-dialog-description">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement) {
              e.preventDefault();
            }
          }}
        >
          <div>
            <Label htmlFor="incidentType">Incident Type</Label>
            <Select onValueChange={(value) => form.setValue("incidentType", value)}>
              <SelectTrigger data-testid="select-incident-type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="stalking">Stalking</SelectItem>
                <SelectItem value="assault">Assault</SelectItem>
                <SelectItem value="theft">Theft</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.incidentType && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.incidentType.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="flex space-x-2">
              <Input
                id="location"
                {...form.register("location")}
                placeholder="Enter address or click map"
                className="flex-1"
                data-testid="input-location"
              />
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                data-testid="button-get-location"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            {form.formState.errors.location && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.location.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe the incident..."
              className="resize-none"
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          <div>
            <Label htmlFor="datetime">Date & Time</Label>
            <Input
              id="datetime"
              type="datetime-local"
              {...form.register("datetime")}
              data-testid="input-datetime"
            />
            {form.formState.errors.datetime && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.datetime.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={form.watch("anonymous")}
              onCheckedChange={(checked) => form.setValue("anonymous", !!checked)}
              data-testid="checkbox-anonymous"
            />
            <Label htmlFor="anonymous" className="text-sm">
              Report anonymously
            </Label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
