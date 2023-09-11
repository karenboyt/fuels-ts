import { readdirSync, mkdirSync, copyFileSync, renameSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import replace from 'replace';

type Link = {
  link: string;
  text: string;
  items: Link[];
  collapsed?: boolean;
};

type RegexReplacement = {
  regex: string;
  replacement: string;
};

/**
 * Post build script to trim off undesired leftovers from Typedoc, restructure directories and generate json for links.
 */
const docsDir = join(__dirname, '../src/');
const apiDocsDir = join(docsDir, '/api');
const classesDir = join(apiDocsDir, '/classes');
const modulesDir = join(apiDocsDir, '/modules');
const interfacesDir = join(apiDocsDir, '/interfaces_typedoc');
const enumsDir = join(apiDocsDir, '/enums');

const filesToRemove = [
  'api/modules.md',
  'api/classes',
  'api/modules',
  'api/interfaces_typedoc',
  'api/enums',
];

const filePathReplacements: RegexReplacement[] = [];

const { log } = console;

/**
 * Removes unwanted files and dirs generated by typedoc.
 */
const removeUnwantedFiles = () =>
  filesToRemove.forEach((dirPath) => {
    const fullDirPath = join(docsDir, dirPath);
    rmSync(fullDirPath, { recursive: true, force: true });
  });

const renameInterfaces = async () => {
  await renameSync(join(apiDocsDir, 'interfaces'), join(apiDocsDir, 'interfaces_typedoc'));
};

/**
 * Generates a json file containing the links for the sidebar to be used by vitepress.
 */
const exportLinksJson = () => {
  const links: Link = { link: '/api/', text: 'API', items: [] };
  const directories = readdirSync(apiDocsDir);
  directories
    .filter((directory) => !directory.endsWith('.md'))
    .forEach((directory) => {
      links.items.push({ text: directory, link: `/api/${directory}/`, collapsed: true, items: [] });
      readdirSync(join(apiDocsDir, directory))
        .filter((file) => file !== 'index.md')
        .forEach((file) => {
          const index = links.items.findIndex((item) => item.text === directory);
          if (index !== -1) {
            const name = file.split('.')[0];
            links.items[index].items.push({
              text: name,
              link: `/api/${directory}/${name}`,
              items: [],
            });
          }
        });
    });

  writeFileSync('.typedoc/api-links.json', JSON.stringify(links));
};

/**
 * Alters the typedoc generated file structure to be more semantic.
 */
const alterFileStructure = async () => {
  const modulesFiles = readdirSync(modulesDir);
  const classesFiles = readdirSync(classesDir);
  const interfacesFiles = readdirSync(interfacesDir);
  const enumsFiles = readdirSync(enumsDir);

  const files = [
    ...classesFiles.map((c) => ({ name: c, path: classesDir })),
    ...interfacesFiles.map((i) => ({ name: i, path: interfacesDir })),
    ...enumsFiles.map((e) => ({ name: e, path: enumsDir })),
  ];

  await modulesFiles.forEach((modulesFile) => {
    // Create a new directory for each module
    const newDirName = modulesFile.split('.')[0];
    const newDirPath = join(apiDocsDir, newDirName);
    mkdirSync(newDirPath);

    // Prepare new module directory to remove 'fuel_ts_' prefix
    const formattedDirName = newDirPath.split('fuel_ts_')[1];
    const capitalisedDirName = formattedDirName.charAt(0).toUpperCase() + formattedDirName.slice(1);

    files.forEach(({ name, path }) => {
      if (name.startsWith(newDirName)) {
        const newFilePath = join(newDirPath, name);
        copyFileSync(join(path, name), newFilePath);

        // Rename the file to remove module prefix
        const newName = name.split('-')[1];
        renameSync(newFilePath, join(newDirPath, newName));
        // Push a replacement for internal links cleanup
        filePathReplacements.push({
          regex: name,
          replacement: `/api/${capitalisedDirName}/${newName}`,
        });
      }
    });

    // Move module index file
    copyFileSync(join(modulesDir, modulesFile), join(newDirPath, 'index.md'));

    // Push a replacement for internal links cleanup
    filePathReplacements.push({
      regex: modulesFile,
      replacement: `/api/${capitalisedDirName}/index.md`,
    });

    // Rename module directory to capitalised name
    renameSync(newDirPath, join(apiDocsDir, capitalisedDirName));
  });
};

/**
 * Recreates the generated typedoc links
 */
const recreateInternalLinks = () => {
  const topLevelDirs = readdirSync(apiDocsDir);

  const prefixReplacements: RegexReplacement[] = [
    // Prefix/Typedoc cleanups
    { regex: '../modules/', replacement: '/api/' },
    { regex: '../classes/', replacement: '/api/' },
    { regex: '../interfaces/', replacement: '/api/' },
    { regex: '../enums/', replacement: '/api/' },
    { regex: 'fuel_ts_', replacement: '' },
    { regex: '/api//api/', replacement: '/api/' },
    // Resolves `[plugin:vite:vue] Element is missing end tag.` error
    { regex: '<', replacement: '&lt;' },
  ];

  topLevelDirs
    .filter((directory) => !directory.endsWith('.md'))
    .forEach((dir) => {
      [...filePathReplacements, ...prefixReplacements].forEach(({ regex, replacement }) => {
        replace({
          regex,
          replacement,
          paths: [join(apiDocsDir, dir)],
          recursive: true,
          silent: true,
        });
      });
    });
};

const main = async () => {
  log('Cleaning up API docs.');
  await renameInterfaces();
  await alterFileStructure();
  removeUnwantedFiles();
  exportLinksJson();
  recreateInternalLinks();
};

main().catch(process.stderr.write);
