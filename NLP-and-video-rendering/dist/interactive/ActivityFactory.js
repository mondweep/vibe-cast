"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityFactory = void 0;
class ActivityFactory {
    generate(enrichedContent) {
        const modules = [];
        for (const unit of enrichedContent.units) {
            const module = this.createModuleFromUnit(unit);
            modules.push(module);
        }
        const totalEstimatedTime = modules.reduce((sum, module) => sum +
            module.components.reduce((componentSum, component) => componentSum + component.estimatedTime, 0), 0);
        return {
            modules,
            totalEstimatedTime,
        };
    }
    createModuleFromUnit(unit) {
        const components = [];
        if (unit.questions.length > 0) {
            components.push({
                id: `assessment-${unit.id}`,
                type: 'assessment',
                title: `${unit.title} - Knowledge Check`,
                instruction: 'Answer the following questions to test your understanding',
                estimatedTime: unit.questions.length * 2,
                questions: unit.questions,
                passingScore: 80,
                randomize: false,
                allowRetry: true,
                maxAttempts: 3,
            });
        }
        for (const activity of unit.suggestedActivities) {
            if (activity.type === 'flashcards') {
                components.push({
                    id: `flashcard-${unit.id}`,
                    type: 'flashcard',
                    title: activity.title,
                    instruction: activity.instruction,
                    estimatedTime: activity.estimatedTime,
                    cards: unit.keyPoints.map((point, index) => ({
                        id: `card-${index}`,
                        front: point,
                        back: unit.summary,
                    })),
                    mode: 'study',
                });
            }
            else if (activity.type === 'drag-drop') {
                components.push({
                    id: `dragdrop-${unit.id}`,
                    type: 'drag-drop',
                    title: activity.title,
                    instruction: activity.instruction,
                    estimatedTime: activity.estimatedTime,
                    items: unit.keyPoints.map((point, index) => ({
                        id: `item-${index}`,
                        content: point,
                    })),
                    targets: unit.keyPoints.map((point, index) => ({
                        id: `target-${index}`,
                        label: `Target ${index + 1}`,
                        acceptedItems: [`item-${index}`],
                    })),
                    correctMatches: unit.keyPoints.map((point, index) => ({
                        itemId: `item-${index}`,
                        targetId: `target-${index}`,
                    })),
                    feedback: {
                        correct: 'Excellent! You matched all items correctly.',
                        incorrect: 'Some items are not in the correct position. Try again.',
                    },
                });
            }
        }
        return {
            id: `module-${unit.id}`,
            unitId: unit.id,
            title: unit.title,
            components,
            completionCriteria: {
                type: 'all',
            },
        };
    }
}
exports.ActivityFactory = ActivityFactory;
//# sourceMappingURL=ActivityFactory.js.map