import { residentRouter } from "@/server/api/routers/resident";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { assessmentRouter } from "./routers/assessment";
import { facilityRouter } from "./routers/facility";
import { ftagRouter } from "./routers/ftag";
import { questionRouter } from "./routers/question";
import { templateRouter } from "./routers/template";
import { surveyRouter } from "./routers/survey";
import { userRouter } from "./routers/user";
import { dietarySurveyRouter } from "./routers/dietary-survey";
import { casesRouter } from "./routers/case";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  resident: residentRouter,
  facility: facilityRouter,
  assessment: assessmentRouter,
  ftag: ftagRouter,
  cases: casesRouter,
  question: questionRouter,
  template: templateRouter,
  survey: surveyRouter,
  user: userRouter,
  dietarySurvey: dietarySurveyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
