import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/9779800000000"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg animate-float transition-transform hover:scale-110"
    style={{ background: "#25D366" }}
    aria-label="Chat on WhatsApp"
  >
    <MessageCircle size={26} className="text-primary-foreground" />
  </a>
);

export default WhatsAppButton;
