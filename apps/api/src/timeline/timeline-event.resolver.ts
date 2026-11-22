import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { TimelineEventDto } from './dto/timeline-event.dto.js';
import { TimelineService } from './timeline.service.js';

@Resolver(() => TimelineEventDto)
export class TimelineEventResolver {
  constructor(private readonly timelineService: TimelineService) {}

  @Query(() => TimelineEventDto, {
    nullable: true,
    description:
      'One timeline event by "<ResourceType>/<id>"; null when no such event exists.',
  })
  timelineEvent(
    @Args('id', { type: () => ID }) id: string,
  ): TimelineEventDto | null {
    return this.timelineService.getEvent(id);
  }
}
