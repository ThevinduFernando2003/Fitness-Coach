import { EXERCISES } from "@fitness-coach/shared";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({
      where: { key: ex.key },
      update: {
        name: ex.name,
        discipline: ex.discipline,
        trackingMode: ex.trackingMode,
        successMetric: ex.successMetric,
        met: ex.met,
        visionSupported: ex.visionSupported,
        defaultReps: ex.defaultReps,
        defaultHold: ex.defaultHold,
        defaultWork: ex.defaultWork,
        defaultRest: ex.defaultRest,
        cues: ex.cues,
      },
      create: {
        key: ex.key,
        name: ex.name,
        discipline: ex.discipline,
        trackingMode: ex.trackingMode,
        successMetric: ex.successMetric,
        met: ex.met,
        visionSupported: ex.visionSupported,
        defaultReps: ex.defaultReps,
        defaultHold: ex.defaultHold,
        defaultWork: ex.defaultWork,
        defaultRest: ex.defaultRest,
        cues: ex.cues,
      },
    });
  }
  console.log(`Seeded ${EXERCISES.length} exercises.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
