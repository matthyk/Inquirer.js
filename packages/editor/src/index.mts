import { editAsync } from 'external-editor';
import {
  createPrompt,
  useEffect,
  useState,
  useKeypress,
  usePrefix,
  isEnterKey,
  makeTheme,
  type PromptConfig,
  type InquirerReadline,
  type Theme,
} from '@inquirer/core';
import type {} from '@inquirer/type';

type EditorConfig = PromptConfig<{
  default?: string;
  postfix?: string;
  waitForUseInput?: boolean;
  validate?: (value: string) => boolean | string | Promise<string | boolean>;
  theme?: Partial<Theme>;
}>;

export default createPrompt<string, EditorConfig>((config, done) => {
  const { waitForUseInput = true, validate = () => true } = config;
  const [status, setStatus] = useState<string>('pending');
  const [value, setValue] = useState<string>(config.default || '');
  const [errorMsg, setError] = useState<string | undefined>(undefined);

  const theme = makeTheme(config.theme);
  const isLoading = status === 'loading';
  const prefix = usePrefix({ isLoading, theme });

  function startEditor(rl: InquirerReadline) {
    rl.pause();
    editAsync(
      value,
      async (error, answer) => {
        rl.resume();
        if (error) {
          setError(error.toString());
        } else {
          setStatus('loading');
          const isValid = await validate(answer);
          if (isValid === true) {
            setError(undefined);
            setStatus('done');
            done(answer);
          } else {
            setValue(answer);
            setError(isValid || 'You must provide a valid value');
            setStatus('pending');
          }
        }
      },
      {
        postfix: config.postfix || '.txt',
      },
    );
  }

  useEffect((rl) => {
    if (!waitForUseInput) {
      startEditor(rl);
    }
  }, []);

  useKeypress((key, rl) => {
    // Ignore keypress while our prompt is doing other processing.
    if (status !== 'pending') {
      return;
    }

    if (isEnterKey(key)) {
      startEditor(rl);
    }
  });

  const message = theme.style.message(config.message);
  let helpTip = '';
  if (status === 'loading') {
    helpTip = theme.style.defaultAnswer('Received');
  } else if (status === 'pending') {
    const enterKey = theme.style.key('enter');
    helpTip = theme.style.defaultAnswer(
      `Press ${enterKey} to launch your preferred editor.`,
    );
  }

  let error = '';
  if (errorMsg) {
    error = theme.style.error(errorMsg);
  }

  return [`${prefix} ${message} ${helpTip}`, error];
});
