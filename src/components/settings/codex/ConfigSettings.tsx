import { useEffect, useState } from 'react';
import { CodeEditor } from '@/features/files';
import { getCodexHome, readTextFile, writeFile } from '@/services/apiAdapt';
import { getErrorMessage } from '@/utils/errorUtils';

const CONFIG_FILE_NAME = 'config.toml';

export function ConfigSettings() {
  const [configPath, setConfigPath] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      setStatusMessage(null);

      try {
        const home = await getCodexHome();
        const normalizedHome = home.replace(/\/$/, '');
        const filePath = `${normalizedHome}/${CONFIG_FILE_NAME}`;
        setConfigPath(filePath);

        const fileContent = await readTextFile(filePath);
        if (!active) {
          return;
        }

        setContent(fileContent);
      } catch (err) {
        if (!active) {
          return;
        }

        const errorMessage = getErrorMessage(err);
        if (errorMessage.includes('does not exist')) {
          setContent('');
          setStatusMessage(`${CONFIG_FILE_NAME} does not exist yet. Save to create it.`);
          return;
        }

        setError(errorMessage);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (newContent: string) => {
    if (!configPath) {
      throw new Error('Config path is not ready.');
    }

    setError(null);
    setStatusMessage(null);

    try {
      await writeFile(configPath, newContent);
      setContent(newContent);
      setStatusMessage('Configuration saved.');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3>Configuration</h3>
        <p className="text-xs font-semibold tracking-wider text-muted-foreground">
          {configPath || `Loading ${CONFIG_FILE_NAME}...`}
        </p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading configuration...</div>
        ) : null}
        {error ? (
          <div className="rounded border border-destructive/70 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
            {statusMessage}
          </div>
        ) : null}
        <div className="h-[640px] min-h-[420px] overflow-hidden rounded-md border">
          <CodeEditor
            content={content}
            filePath={configPath || CONFIG_FILE_NAME}
            isReadOnly={loading || !configPath}
            onContentChange={setContent}
            onSave={handleSave}
          />
        </div>
      </section>
    </div>
  );
}
