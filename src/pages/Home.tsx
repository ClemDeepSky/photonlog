import { useEffect } from "react";
import Landing from "@/components/marketing/Landing";

const Home = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Photonlog — Suivez vos acquisitions astrophoto";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return <Landing />;
};

export default Home;
