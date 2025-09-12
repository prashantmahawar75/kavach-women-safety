import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MapZone } from "@/types";

interface ZoneInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: MapZone | null;
}

export default function ZoneInfoModal({ isOpen, onClose, zone }: ZoneInfoModalProps) {
  if (!zone) return null;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      default: return 'text-yellow-600';
    }
  };

  const getRiskBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Zone Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center">
            <div className={`w-4 h-4 ${getRiskBgColor(zone.riskLevel)} rounded-full mr-3`}></div>
            <span className="font-medium" data-testid="text-zone-name">{zone.name}</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Reports</p>
                <p className="font-semibold text-xl" data-testid="text-report-count">
                  {zone.reportCount}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Risk Level</p>
                <p className={`font-semibold text-xl capitalize ${getRiskColor(zone.riskLevel)}`} data-testid="text-risk-level">
                  {zone.riskLevel}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Location</p>
            <div className="text-sm p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">
                Lat: {Number(zone.latitude).toFixed(4)}, Lng: {Number(zone.longitude).toFixed(4)}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              className="w-full" 
              onClick={onClose}
              data-testid="button-close-zone-info"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
