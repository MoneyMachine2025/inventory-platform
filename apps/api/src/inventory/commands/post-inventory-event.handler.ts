import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

export class PostInventoryEventCommand {
  constructor(
    readonly tenantId: string,
    readonly eventData: any,
  ) {}
}

@CommandHandler(PostInventoryEventCommand)
export class PostInventoryEventHandler implements ICommandHandler<PostInventoryEventCommand> {
  async execute(command: PostInventoryEventCommand) {
    // Handler implementation can be added here if needed for more complex logic
    // For now, the service handles it directly
  }
}
