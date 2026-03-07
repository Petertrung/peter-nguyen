<!-- Resume.vue or inside your view -->
<script setup lang="ts">
import TimelineItem from '@/components/TimelineItem.vue';
</script>

<template>
    <div class="timeline">
        <TimelineItem>
            <template #icon>
                <IconComputer />
            </template>
            <template #heading>Application Developer — City of Seattle</template>
            <span class="date">July 2023 – Present</span>
            I support and maintain the City of Seattle’s financial budgeting applications, ensuring reliability and
            smooth
            operations for core budgeting workflows. I also build new internal tools, including an apartment rental data
            application
            using React, AWS, SQL, Node.js, and Oracle. My work focuses on delivering stable, maintainable systems that
            improve data
            access and department efficiency.
        </TimelineItem>

        <TimelineItem>
            <template #icon>
                <IconComputer />
            </template>
            <template #heading>CS Tutor — North Seattle College</template>
            <span class="date"> January 2022 – June 2023</span>
            Tutoring students one on one at North Seattle College, supporting web programming,
            JavaScript, and SQL courses (IT 102, 161, 125, 111, 112, 115).
        </TimelineItem>

                <TimelineItem>
            <template #icon>
                <IconComputer />
            </template>
            <template #heading>Coding Mentor — Mighty Coders</template>
            <span class="date">July 2021 – November 2021</span>
            Mentored kids aged 7–14 in coding using Scratch, JavaScript, and Python through
            game-building projects. Ran intensive week-long summer coding camps.
        </TimelineItem>

        <TimelineItem>
            <template #icon>
                <IconBriefcase />
            </template>
            <template #heading>Front-End Developer — Shield Compliance</template>
            <span class="date">May 2019 – Aug 2020</span>
            Collaborated on planning, wireframing, and prototyping new features for a fintech app
            used by financial institutions managing marijuana-related businesses. Built tables for
            transaction data, SAR submission flows, and data visualizations using AngularJS,
            Bootstrap, and ASP.Net with TDD practices.
        </TimelineItem>

        <TimelineItem>
            <template #icon>
                <IconBriefcase />
            </template>
            <template #heading>Front-End Web Developer — Columbia Bank</template>
            <span class="date">Oct 2017 – Feb 2019</span>
            Maintained the company intranet for 150+ branches and 2,500+ employees. Built
            seasonal redesigns, created custom PHP add-ons for email and WYSIWYG editing,
            and used Bootstrap and Git for consistency and version control.
        </TimelineItem>
    </div>
</template>

<style scoped>
.timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.date {
    display: block;
    font-size: 0.8rem;
    color: var(--color-text);
    opacity: 0.6;
    margin-bottom: 0.4rem;
}

@media (min-width: 1024px) {
    .timeline {
        padding-left: calc(var(--section-gap) / 2);
        border-left: 1px solid var(--color-border);
    }
}
</style>