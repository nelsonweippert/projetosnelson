-- CreateTable
CREATE TABLE "reference_areas" (
    "referenceId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "reference_areas_pkey" PRIMARY KEY ("referenceId","areaId")
);

-- CreateTable
CREATE TABLE "content_areas" (
    "contentId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "content_areas_pkey" PRIMARY KEY ("contentId","areaId")
);

-- CreateTable
CREATE TABLE "calendar_event_areas" (
    "calendarEventId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,

    CONSTRAINT "calendar_event_areas_pkey" PRIMARY KEY ("calendarEventId","areaId")
);

-- AddForeignKey
ALTER TABLE "reference_areas" ADD CONSTRAINT "reference_areas_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_areas" ADD CONSTRAINT "reference_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_areas" ADD CONSTRAINT "content_areas_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_areas" ADD CONSTRAINT "content_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_areas" ADD CONSTRAINT "calendar_event_areas_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_areas" ADD CONSTRAINT "calendar_event_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
