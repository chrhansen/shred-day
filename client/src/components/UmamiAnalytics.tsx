import { useEffect } from "react";
import { installUmamiTracking } from "@/lib/umami";

const UmamiAnalytics = () => {
  useEffect(() => {
    installUmamiTracking();
  }, []);

  return null;
};

export default UmamiAnalytics;
