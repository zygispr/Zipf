// Contract tests for specs/002-scss-styling/contracts/stylesheet-authoring.md. Stylesheets go
// through Vite's own CSS pipeline, so the test and the build agree on load paths (research R8).
import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preprocessCSS, resolveConfig, type ResolvedConfig } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ButtonVariant } from '../../src/components/atoms/Button/Button';
import type { HeadingProps } from '../../src/components/atoms/Heading/Heading';
import type { TextVariant } from '../../src/components/atoms/Text/Text';
import type { ResultsLayoutProps } from '../../src/components/templates/ResultsLayout/ResultsLayout';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Every `styles[expression]` lookup, keyed by component, with every value it can take: `true` when
 * the value must be a class, `false` when it deliberately has none (ResultsLayout styles only its
 * heading slot). Each entry is typed against the component's own union, so typecheck fails when
 * the union changes.
 */
const DYNAMIC_LOOKUPS: Record<string, Record<string, boolean>> = {
  'src/components/atoms/Button/Button.tsx': {
    primary: true,
    secondary: true,
    ghost: true,
  } satisfies Record<ButtonVariant, boolean>,
  'src/components/atoms/Text/Text.tsx': {
    body: true,
    caption: true,
    lead: true,
  } satisfies Record<TextVariant, boolean>,
  'src/components/atoms/Heading/Heading.tsx': {
    h1: true,
    h2: true,
    h3: true,
  } satisfies Record<`h${HeadingProps['level']}`, boolean>,
  'src/components/templates/ResultsLayout/ResultsLayout.tsx': {
    heading: true,
    toolbar: false,
    stats: false,
    visualization: false,
    search: false,
    table: false,
  } satisfies Record<keyof ResultsLayoutProps, boolean>,
};

const STYLESHEET_IMPORT = /import (\w+) from '(\.{1,2}\/[^']+\.module\.scss)'/g;

let config: ResolvedConfig;
const compiled = new Map<string, ReturnType<typeof preprocessCSS>>();

/** Compiles a stylesheet with the build's settings; errors carry the file path and Sass's line. */
function compile(path: string) {
  let result = compiled.get(path);
  if (!result) {
    const absolutePath = join(ROOT, path);
    result = preprocessCSS(readFileSync(absolutePath, 'utf8'), absolutePath, config).catch(
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${path}: ${message}`, { cause: error });
      },
    );
    compiled.set(path, result);
  }
  return result;
}

const glob = (pattern: string) => globSync(pattern, { cwd: ROOT }).sort();

beforeAll(async () => {
  config = await resolveConfig({ root: ROOT }, 'build');
});

describe('stylesheets', () => {
  it('are all SCSS', () => {
    expect(glob('src/**/*.css'), 'convert these to .scss').toEqual([]);
  });

  it('breakpoints are named', () => {
    const failures = glob('src/**/*.scss')
      .filter((path) => path !== 'src/styles/_media.scss')
      .flatMap((path) =>
        readFileSync(join(ROOT, path), 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            /^\s*@media\b.*width/.test(line) ? [`${path}:${String(index + 1)}`] : [],
          ),
      );
    expect(failures, 'use media.narrow or media.wide instead of a width').toEqual([]);
  });

  it('every stylesheet compiles', async () => {
    const stylesheets = glob('src/**/*.{css,scss}');
    expect(stylesheets.length).toBeGreaterThan(0);
    for (const path of stylesheets) await compile(path);
  });

  it('every class a component uses exists', async () => {
    const failures: string[] = [];
    const components = glob('src/**/*.tsx').filter((path) => !path.endsWith('.test.tsx'));

    for (const component of components) {
      const source = readFileSync(join(ROOT, component), 'utf8');
      for (const [, binding = '', specifier = ''] of source.matchAll(STYLESHEET_IMPORT)) {
        const stylesheet = join(dirname(component), specifier);
        const classes = new Set(Object.keys((await compile(stylesheet)).modules ?? {}));
        const missing = (name: string) => {
          if (!classes.has(name)) {
            failures.push(
              `${basename(component)} uses ${binding}.${name}, but ${basename(stylesheet)} has no .${name} class`,
            );
          }
        };

        for (const [, name = ''] of source.matchAll(new RegExp(`\\b${binding}\\.(\\w+)`, 'g'))) {
          missing(name);
        }
        for (const [, literal] of source.matchAll(
          new RegExp(`\\b${binding}\\[(?:'(\\w+)'\\])?`, 'g'),
        )) {
          if (literal !== undefined) {
            missing(literal);
            continue;
          }
          const lookup = DYNAMIC_LOOKUPS[component];
          if (!lookup) {
            failures.push(
              `${component} looks up ${binding}[…] dynamically; add it to DYNAMIC_LOOKUPS`,
            );
            continue;
          }
          for (const [name, isClass] of Object.entries(lookup)) if (isClass) missing(name);
        }
      }
    }

    expect([...new Set(failures)]).toEqual([]);
  });
});
