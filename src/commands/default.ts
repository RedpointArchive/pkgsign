import {
    Command,
    command,
    param,
} from 'clime';
  
@command({
    description: 'do nothing',
})
export default class extends Command {
    public async execute(): Promise<void> {

    }
}