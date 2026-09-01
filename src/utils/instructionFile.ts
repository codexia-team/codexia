import { readTextFile, writeFile } from '@/services/apiAdapt';

type InstructionFileOptions = {
  path: string;
  autoCreate?: boolean;
};

type InstructionFileResult = {
  content: string;
  missing: boolean;
  created: boolean;
};

export const isMissingFileError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('os error 2') ||
    message.toLowerCase().includes('does not exist') ||
    message.toLowerCase().includes('no such file') ||
    message.toLowerCase().includes('not found')
  );
};

export const loadInstructionFile = async (
  options: InstructionFileOptions
): Promise<InstructionFileResult> => {
  try {
    const content = await readTextFile(options.path);
    return { content, missing: false, created: false };
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
    if (options.autoCreate) {
      await writeFile(options.path, '');
      return { content: '', missing: true, created: true };
    }
    return { content: '', missing: true, created: false };
  }
};

export const saveInstructionFile = async (
  options: InstructionFileOptions & { content: string }
) => {
  await writeFile(options.path, options.content);
};
