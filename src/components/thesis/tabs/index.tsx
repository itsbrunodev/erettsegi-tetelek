import { useEffect, useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ThesisType } from "@/lib/types";
import { shuffleArray } from "@/lib/utils";

import { ThesisNarration } from "./narration";
import { ThesisQuiz } from "./quiz";

type TabValue = "tetel" | "narracio" | "kviz";

export interface QuestionType {
  question: string;
  reason: string;
  choices: { content: string; correct: boolean }[];
}

export interface IncompleteType {
  sentence: string;
  choices: {
    content: string;
    correct: boolean;
  }[];
}

interface QuizDataType {
  questions: QuestionType[];
  incomplete: IncompleteType[];
}

type ThesisTabsProps = {
  children: React.ReactNode;
  id: string;
  type: ThesisType;
  hasQuestions: boolean;
  questionsData: QuestionType[] | null;
  incompleteData: IncompleteType[] | null;
};

export function ThesisTabs({
  children,
  id,
  type,
  hasQuestions,
  questionsData,
  incompleteData,
}: ThesisTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("tetel");

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const oldal = params.get("oldal");
      const currentTab =
        oldal === "kviz" ? "kviz" : oldal === "narracio" ? "narracio" : "tetel";

      setActiveTab(currentTab);
    };

    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (newTab === "kviz") {
      params.set("oldal", "kviz");
    } else if (newTab === "narracio") {
      params.set("oldal", "narracio");
    } else {
      params.delete("oldal");
    }

    history.replaceState({}, "", url);
  };

  const quizData: QuizDataType = useMemo(
    () => ({
      questions: questionsData || [],
      incomplete: incompleteData || [],
    }),
    [questionsData, incompleteData],
  );

  const shuffledQuizData = useMemo(() => {
    const processedQuestions = quizData.questions.map((q) => ({
      ...q,
      choices: shuffleArray(q.choices),
    }));

    const processedIncomplete = quizData.incomplete.map((inc) => ({
      ...inc,
      missing: {
        choices: shuffleArray(inc.choices),
      },
    }));

    const allItems = [...processedQuestions, ...processedIncomplete];

    return shuffleArray(allItems);
  }, [quizData, activeTab]);

  if (!hasQuestions) {
    return <div>{children}</div>;
  }

  return (
    <Tabs className="gap-0" value={activeTab} onValueChange={handleTabChange}>
      <div className="mb-4">
        <TabsList>
          <TabsTrigger value="tetel">Tétel</TabsTrigger>
          <TabsTrigger value="narracio">Narráció</TabsTrigger>
          <TabsTrigger value="kviz">Kvíz</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="tetel">{children}</TabsContent>
      <TabsContent value="narracio">
        <div className="mb-6 border-b pb-4">
          <h1 className="font-bold text-2xl">Narráció</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            A tétel tömörebb változata
          </p>
        </div>
        <ThesisNarration
          data={{
            id,
            type,
          }}
        />
      </TabsContent>
      <TabsContent value="kviz">
        <div className="mb-6 border-b pb-4">
          <h1 className="font-bold text-2xl">Kvíz</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            {shuffledQuizData.length} darab feladat
          </p>
        </div>
        <ThesisQuiz data={shuffledQuizData} />
      </TabsContent>
    </Tabs>
  );
}
