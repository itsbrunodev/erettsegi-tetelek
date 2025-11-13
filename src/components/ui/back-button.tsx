import { ChevronLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface BackButtonProps {
  href: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ href }) => {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const referrerUrl = document.referrer;
    const isInternal = referrerUrl.startsWith(window.location.origin);

    setCanGoBack(isInternal && window.history.length > 1);
  }, []);

  const handleClick = () => {
    if (canGoBack) {
      window.history.back();
    } else {
      window.location.href = href;
    }
  };

  return (
    <Button
      className="mb-2 flex items-center px-0!"
      variant="link"
      onClick={handleClick}
    >
      <ChevronLeftIcon />
      Vissza a többi tételhez
    </Button>
  );
};
