import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import EmergencyModal from "@/components/emergency-modal";

export default function EmergencyButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl transform hover:scale-110 transition-all"
          onClick={() => setShowModal(true)}
          data-testid="button-emergency"
          aria-label="Emergency Button"
        >
          <AlertTriangle className="h-8 w-8" />
        </Button>
      </div>
      
      {showModal && (
        <EmergencyModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}
