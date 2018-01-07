import {
    Command,
    command,
    param,
} from 'clime';
  
@command({
    description: 'sign an npm/yarn package directory',
})
export default class extends Command {
    execute(
        @param({
            description: 'path to package directory',
            required: true,
        })
        dir: string,
    ) {
        return `Hello, ${dir}!`;
    }
}