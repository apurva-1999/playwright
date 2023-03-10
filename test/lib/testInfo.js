"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TestInfoImpl = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _timeoutManager = require("./timeoutManager");

var _util = require("./util");

var _utils = require("playwright-core/lib/utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class TestInfoImpl {
  // fn -> title
  // ------------ TestInfo fields ------------
  get error() {
    return this.errors[0];
  }

  set error(e) {
    if (e === undefined) throw new Error('Cannot assign testInfo.error undefined value!');
    this.errors[0] = e;
  }

  get timeout() {
    return this._timeoutManager.defaultSlotTimings().timeout;
  }

  set timeout(timeout) {// Ignored.
  }

  constructor(loader, project, workerParams, test, retry, addStepImpl) {
    this._addStepImpl = void 0;
    this._test = void 0;
    this._timeoutManager = void 0;
    this._startTime = void 0;
    this._startWallTime = void 0;
    this._hasHardError = false;
    this._screenshotsDir = void 0;
    this._onTestFailureImmediateCallbacks = new Map();
    this.repeatEachIndex = void 0;
    this.retry = void 0;
    this.workerIndex = void 0;
    this.parallelIndex = void 0;
    this.project = void 0;
    this.config = void 0;
    this.title = void 0;
    this.titlePath = void 0;
    this.file = void 0;
    this.line = void 0;
    this.column = void 0;
    this.fn = void 0;
    this.expectedStatus = void 0;
    this.duration = 0;
    this.annotations = [];
    this.attachments = [];
    this.status = 'passed';
    this.stdout = [];
    this.stderr = [];
    this.snapshotSuffix = '';
    this.outputDir = void 0;
    this.snapshotDir = void 0;
    this.errors = [];
    this.currentStep = void 0;
    this._test = test;
    this._addStepImpl = addStepImpl;
    this._startTime = (0, _utils.monotonicTime)();
    this._startWallTime = Date.now();
    this.repeatEachIndex = workerParams.repeatEachIndex;
    this.retry = retry;
    this.workerIndex = workerParams.workerIndex;
    this.parallelIndex = workerParams.parallelIndex;
    this.project = project;
    this.config = loader.fullConfig();
    this.title = test.title;
    this.titlePath = test.titlePath();
    this.file = test.location.file;
    this.line = test.location.line;
    this.column = test.location.column;
    this.fn = test.fn;
    this.expectedStatus = test.expectedStatus;
    this._timeoutManager = new _timeoutManager.TimeoutManager(this.project.timeout);

    this.outputDir = (() => {
      const relativeTestFilePath = _path.default.relative(this.project.testDir, test._requireFile.replace(/\.(spec|test)\.(js|ts|mjs)$/, ''));

      const sanitizedRelativePath = relativeTestFilePath.replace(process.platform === 'win32' ? new RegExp('\\\\', 'g') : new RegExp('/', 'g'), '-');
      const fullTitleWithoutSpec = test.titlePath().slice(1).join(' ');
      let testOutputDir = (0, _util.trimLongString)(sanitizedRelativePath + '-' + (0, _util.sanitizeForFilePath)(fullTitleWithoutSpec));
      if (project._id) testOutputDir += '-' + (0, _util.sanitizeForFilePath)(project._id);
      if (this.retry) testOutputDir += '-retry' + this.retry;
      if (this.repeatEachIndex) testOutputDir += '-repeat' + this.repeatEachIndex;
      return _path.default.join(this.project.outputDir, testOutputDir);
    })();

    this.snapshotDir = (() => {
      const relativeTestFilePath = _path.default.relative(this.project.testDir, test._requireFile);

      return _path.default.join(this.project.snapshotDir, relativeTestFilePath + '-snapshots');
    })();

    this._screenshotsDir = (() => {
      const relativeTestFilePath = _path.default.relative(this.project.testDir, test._requireFile);

      return _path.default.join(this.project._screenshotsDir, relativeTestFilePath);
    })();
  }

  _modifier(type, modifierArgs) {
    if (typeof modifierArgs[1] === 'function') {
      throw new Error(['It looks like you are calling test.skip() inside the test and pass a callback.', 'Pass a condition instead and optional description instead:', `test('my test', async ({ page, isMobile }) => {`, `  test.skip(isMobile, 'This test is not applicable on mobile');`, `});`].join('\n'));
    }

    if (modifierArgs.length >= 1 && !modifierArgs[0]) return;
    const description = modifierArgs[1];
    this.annotations.push({
      type,
      description
    });

    if (type === 'slow') {
      this._timeoutManager.slow();
    } else if (type === 'skip' || type === 'fixme') {
      this.expectedStatus = 'skipped';
      throw new SkipError('Test is skipped: ' + (description || ''));
    } else if (type === 'fail') {
      if (this.expectedStatus !== 'skipped') this.expectedStatus = 'failed';
    }
  }

  async _runWithTimeout(cb) {
    const timeoutError = await this._timeoutManager.runWithTimeout(cb); // Do not overwrite existing failure upon hook/teardown timeout.

    if (timeoutError && (this.status === 'passed' || this.status === 'skipped')) {
      this.status = 'timedOut';
      this.errors.push(timeoutError);
    }

    this.duration = this._timeoutManager.defaultSlotTimings().elapsed | 0;
  }

  async _runFn(fn, skips) {
    try {
      await fn();
    } catch (error) {
      if (skips === 'allowSkips' && error instanceof SkipError) {
        if (this.status === 'passed') this.status = 'skipped';
      } else {
        const serialized = (0, _util.serializeError)(error);

        this._failWithError(serialized, true
        /* isHardError */
        );

        return serialized;
      }
    }
  }

  _addStep(data) {
    return this._addStepImpl(data);
  }

  _failWithError(error, isHardError) {
    // Do not overwrite any previous hard errors.
    // Some (but not all) scenarios include:
    //   - expect() that fails after uncaught exception.
    //   - fail after the timeout, e.g. due to fixture teardown.
    if (isHardError && this._hasHardError) return;
    if (isHardError) this._hasHardError = true;
    if (this.status === 'passed' || this.status === 'skipped') this.status = 'failed';
    this.errors.push(error);
  }

  async _runAsStep(cb, stepInfo) {
    const step = this._addStep(stepInfo);

    try {
      const result = await cb();
      step.complete({});
      return result;
    } catch (e) {
      step.complete({
        error: e instanceof SkipError ? undefined : (0, _util.serializeError)(e)
      });
      throw e;
    }
  }

  _isFailure() {
    return this.status !== 'skipped' && this.status !== this.expectedStatus;
  } // ------------ TestInfo methods ------------


  async attach(name, options = {}) {
    this.attachments.push(await (0, _util.normalizeAndSaveAttachment)(this.outputPath(), name, options));
  }

  outputPath(...pathSegments) {
    _fs.default.mkdirSync(this.outputDir, {
      recursive: true
    });

    const joinedPath = _path.default.join(...pathSegments);

    const outputPath = (0, _util.getContainedPath)(this.outputDir, joinedPath);
    if (outputPath) return outputPath;
    throw new Error(`The outputPath is not allowed outside of the parent directory. Please fix the defined path.\n\n\toutputPath: ${joinedPath}`);
  }

  snapshotPath(...pathSegments) {
    let suffix = '';
    const projectNamePathSegment = (0, _util.sanitizeForFilePath)(this.project.name);
    if (projectNamePathSegment) suffix += '-' + projectNamePathSegment;
    if (this.snapshotSuffix) suffix += '-' + this.snapshotSuffix;
    const subPath = (0, _util.addSuffixToFilePath)(_path.default.join(...pathSegments), suffix);
    const snapshotPath = (0, _util.getContainedPath)(this.snapshotDir, subPath);
    if (snapshotPath) return snapshotPath;
    throw new Error(`The snapshotPath is not allowed outside of the parent directory. Please fix the defined path.\n\n\tsnapshotPath: ${subPath}`);
  }

  _screenshotPath(...pathSegments) {
    const subPath = _path.default.join(...pathSegments);

    const screenshotPath = (0, _util.getContainedPath)(this._screenshotsDir, subPath);
    if (screenshotPath) return screenshotPath;
    throw new Error(`Screenshot name "${subPath}" should not point outside of the parent directory.`);
  }

  skip(...args) {
    this._modifier('skip', args);
  }

  fixme(...args) {
    this._modifier('fixme', args);
  }

  fail(...args) {
    this._modifier('fail', args);
  }

  slow(...args) {
    this._modifier('slow', args);
  }

  setTimeout(timeout) {
    this._timeoutManager.setTimeout(timeout);
  }

}

exports.TestInfoImpl = TestInfoImpl;

class SkipError extends Error {}