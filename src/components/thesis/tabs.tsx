import { useEffect, useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { shuffleArray } from "@/lib/utils";

import { ThesisQuiz } from "./quiz";

type TabValue = "tetel" | "kviz";

export interface QuestionType {
  question: string;
  reason: string;
  choices: { content: string; correct: boolean }[];
}

export interface IncompleteType {
  content: string;
  missing: {
    choices: {
      content: string;
      correct: boolean;
    }[];
  };
}

interface QuizDataType {
  questions: QuestionType[];
  incomplete: IncompleteType[];
}

type ThesisTabsProps = {
  children: React.ReactNode;
  hasQuestions: boolean;
  questionsData: QuestionType[] | null;
  incompleteData: IncompleteType[] | null;
};

export function ThesisTabs({
  children,
  hasQuestions,
  questionsData,
  incompleteData,
}: ThesisTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("tetel");

  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const currentTab = params.get("oldal") === "kviz" ? "kviz" : "tetel";
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
    const allItems = [...quizData.questions, ...quizData.incomplete];

    return shuffleArray(allItems);
  }, [quizData]);

  if (!hasQuestions) {
    return <div>{children}</div>;
  }

  return (
    <Tabs className="gap-0" value={activeTab} onValueChange={handleTabChange}>
      <div className="mb-4">
        <TabsList>
          <TabsTrigger value="tetel">Tétel</TabsTrigger>
          <TabsTrigger value="kviz">Kvíz</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="tetel">{children}</TabsContent>
      <TabsContent value="kviz">
        <div>
          <div className="mb-6 border-b pb-4">
            <h1 className="font-bold text-2xl">Kvíz</h1>
            <p className="text-muted-foreground text-sm tabular-nums">
              {shuffledQuizData.length} darab feladat
            </p>
          </div>
          <ThesisQuiz data={shuffledQuizData} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
