import { useEffect, useState } from "react";

type OrderType = "alfabetikus" | "kronologikus";

export function ThesisOrder() {
  const [active, setActive] = useState<OrderType>("alfabetikus");

  const sortList = (order: OrderType) => {
    const list = document.getElementById("thesis-list");
    if (!list) return;

    const items = Array.from(list.querySelectorAll("li"));

    const collator = new Intl.Collator("hu", {
      numeric: true,
      sensitivity: "base",
    });

    items.sort((a, b) => {
      if (order === "kronologikus") {
        const dateStrA = a.dataset.startDate;
        const dateStrB = b.dataset.startDate;

        if (!dateStrA) return 1;
        if (!dateStrB) return -1;

        const dateA = new Date(dateStrA);
        const dateB = new Date(dateStrB);

        return dateA.getTime() - dateB.getTime();
      }

      return collator.compare(a.dataset.title!, b.dataset.title!);
    });

    for (const item of items) {
      list.appendChild(item);
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const currentOrder =
        (params.get("sorrend") as OrderType) || "alfabetikus";

      setActive(currentOrder);
      sortList(currentOrder);
    };

    handleLocationChange();

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleSortClick = (order: OrderType) => {
    if (order === active) return;

    setActive(order);
    sortList(order);

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (order === "kronologikus") {
      params.set("sorrend", "kronologikus");
    } else {
      params.delete("sorrend");
    }

    history.pushState({}, "", url);
  };

  const kronoClass =
    active === "kronologikus"
      ? "underline text-foreground"
      : "text-muted-foreground hover:underline";
  const alfaClass =
    active === "alfabetikus"
      ? "underline text-foreground"
      : "text-muted-foreground hover:underline";

  return (
    <div className="space-x-1 text-sm [&>button]:cursor-pointer">
      <button
        className={alfaClass}
        type="button"
        onClick={() => handleSortClick("alfabetikus")}
      >
        Alfabetikus
      </button>
      <span>/</span>
      <button
        className={kronoClass}
        type="button"
        onClick={() => handleSortClick("kronologikus")}
      >
        Kronologikus
      </button>
      <span className="text-muted-foreground">sorrend</span>
    </div>
  );
}
