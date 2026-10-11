import { Link } from "react-router-dom";
import logoAsset from "@/assets/photonlog-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  betaClassName?: string;
  showBeta?: boolean;
}

/** Logo Photonlog : image cliquable qui renvoie vers la home, badge Beta optionnel. */
const BrandLogo = ({ className, imgClassName, betaClassName, showBeta = true }: BrandLogoProps) => (
  <Link to="/" className={cn("inline-flex items-center gap-2", className)} aria-label="Accueil Photonlog">
    <img src={logoAsset.url} alt="Photonlog" className={cn("h-7 w-auto", imgClassName)} />
    {showBeta && (
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 rounded-full px-1.5 py-0.5 leading-none", betaClassName)}>
        Beta
      </span>
    )}
  </Link>
);

export default BrandLogo;
