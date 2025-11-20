import React, { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Button } from "../../ui/button";
import { ButtonGroup } from "../../ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import type { IncompleteType, QuestionType } from ".";

export function ThesisQuiz({
  data,
}: {
  data: (QuestionType | IncompleteType)[];
}) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const totalQuestions = useMemo(() => data.length, [data]);

  const handleSelectChange = (id: string, value: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => new Map(prev).set(id, new Set([value])));
  };

  const handleChoiceClick = (id: string, choiceContent: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => {
      const newAnswers = new Map(prev);
      const currentSelection = newAnswers.get(id) || new Set();

      const question = data.find(
        (item) => "question" in item && item.question === id,
      ) as QuestionType | undefined;

      const isMultipleChoice =
        (question?.choices.filter((c) => c.correct).length ?? 0) > 1;

      if (!isMultipleChoice) {
        currentSelection.clear();
      }

      if (currentSelection.has(choiceContent)) {
        currentSelection.delete(choiceContent);
      } else {
        currentSelection.add(choiceContent);
      }

      if (currentSelection.size === 0) {
        newAnswers.delete(id);
      } else {
        newAnswers.set(id, currentSelection);
      }
      return newAnswers;
    });
  };

  const handleCheckAnswers = () => {
    const newResults = new Map<string, boolean>();

    let correctAnswersCount = 0;

    data.forEach((element) => {
      let isCorrect = false;

      // incomplete
      if ("sentence" in element) {
        const userAnswer = selectedAnswers
          .get(element.sentence)
          ?.values()
          .next().value;

        const correctChoice = element.choices.find((c) => c.correct);

        isCorrect = userAnswer === correctChoice?.content;

        newResults.set(element.sentence, isCorrect);

        // question
      } else {
        const userAnswers = selectedAnswers.get(element.question) || new Set();
        const correctAnswers = new Set(
          element.choices.filter((c) => c.correct).map((c) => c.content),
        );

        isCorrect =
          userAnswers.size === correctAnswers.size &&
          [...userAnswers].every((answer) => correctAnswers.has(answer));

        newResults.set(element.question, isCorrect);
      }

      if (isCorrect) {
        correctAnswersCount++;
      }
    });

    setResults(newResults);
    setScore(correctAnswersCount);
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setSelectedAnswers(new Map());
    setResults(new Map());
    setIsSubmitted(false);
    setScore(0);
  };

  const getSelectClasses = (sentenceId: string) => {
    if (!isSubmitted) return "";

    const isCorrect = results.get(sentenceId);

    if (isCorrect) return "border-green-500 ring-green-500/30";
    if (isCorrect === false) return "border-red-500 ring-red-500/30";
    return "border-muted-foreground";
  };

  const getButtonVariant = (
    questionId: string,
    choice: { content: string; correct: boolean },
  ):
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "success" => {
    const isSelected =
      selectedAnswers.get(questionId)?.has(choice.content) ?? false;

    if (!isSubmitted) {
      return isSelected ? "default" : "secondary";
    }

    if (choice.correct) {
      return "success";
    }

    if (isSelected && !choice.correct) {
      return "destructive";
    }

    return "secondary";
  };

  console.log("ASSAD");

  const isCheckButtonDisabled =
    totalQuestions !== selectedAnswers.size || isSubmitted;

  return (
    <div className="flex flex-col gap-8">
      {data.map((element, index) => {
        // incomplete
        if ("sentence" in element) {
          const isIncorrect =
            isSubmitted && results.get(element.sentence) === false;
          const correctAnswer = isIncorrect
            ? element.choices.find((c) => c.correct)?.content
            : null;

          return (
            <div key={element.sentence}>
              <p className="font-medium">
                <span className="mr-2">{index + 1}.</span>
                {element.sentence.split("____").map((content, idx, arr) => (
                  <React.Fragment key={`${element.sentence}-${idx}`}>
                    <span>{content}</span>
                    {idx < arr.length - 1 && (
                      <span className="inline-flex items-center">
                        <Select
                          onValueChange={(value) =>
                            handleSelectChange(element.sentence, value)
                          }
                          disabled={isSubmitted}
                        >
                          <SelectTrigger
                            className={cn(
                              "mx-1 inline-flex h-7 w-auto min-w-24 shrink-0 align-middle transition-colors",
                              getSelectClasses(element.sentence),
                            )}
                            size="sm"
                          >
                            <SelectValue placeholder="..." />
                          </SelectTrigger>
                          <SelectContent>
                            {element.choices.map(
                              ({ content: choiceContent }) => (
                                <SelectItem
                                  value={choiceContent}
                                  key={choiceContent}
                                >
                                  {choiceContent}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
              {correctAnswer && (
                <Alert className="mt-2">
                  <AlertTitle>Helyes Válasz</AlertTitle>
                  <AlertDescription>{correctAnswer}</AlertDescription>
                </Alert>
              )}
            </div>
          );
        }

        // questions
        const correctAnswersCount = element.choices.filter(
          (c) => c.correct,
        ).length;

        return (
          <div className="space-y-2" key={element.question}>
            <h3 className="font-medium">
              {index + 1}. {element.question}
            </h3>
            {correctAnswersCount > 1 && !isSubmitted && (
              <p className="text-muted-foreground text-sm italic">
                Több válasz is megjelölhető.
              </p>
            )}
            <ButtonGroup className="w-full" orientation="vertical">
              {element.choices.map((choice) => (
                <Button
                  className="wrap-break-word h-fit w-full justify-start whitespace-pre-wrap text-start font-normal transition-colors"
                  variant={getButtonVariant(element.question, choice)}
                  key={choice.content}
                  onClick={() =>
                    handleChoiceClick(element.question, choice.content)
                  }
                  disabled={isSubmitted}
                >
                  {choice.content}
                </Button>
              ))}
            </ButtonGroup>
            {isSubmitted && (
              <Alert className="mt-2">
                <AlertTitle>Magyarázat</AlertTitle>
                <AlertDescription>{element.reason}</AlertDescription>
              </Alert>
            )}
          </div>
        );
      })}

      {isSubmitted && (
        <div className="space-y-2 rounded-lg border bg-card p-6 text-center text-card-foreground shadow-sm">
          <h2 className="font-medium text-xl">Eredmény</h2>
          <p className="font-bold text-6xl">
            {((score / totalQuestions) * 100).toFixed(0)}%
          </p>
          <p className="text-muted-foreground">
            {score}/{totalQuestions} kérdésre válaszoltál helyesen.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleCheckAnswers} /* disabled={isCheckButtonDisabled} */
        >
          Válaszok Ellenőrzése
        </Button>
        <Button variant="outline" disabled={!isSubmitted} onClick={handleReset}>
          Újrapróbálkozás
        </Button>
      </div>
    </div>
  );
}
