"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TestCase = exports.Suite = void 0;

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
class Base {
  constructor(title) {
    this.title = void 0;
    this._only = false;
    this._requireFile = '';
    this.title = title;
  }

}

class Suite extends Base {
  constructor(title, type) {
    super(title);
    this.suites = [];
    this.tests = [];
    this.location = void 0;
    this.parent = void 0;
    this._use = [];
    this._skipped = false;
    this._entries = [];
    this._hooks = [];
    this._timeout = void 0;
    this._annotations = [];
    this._modifiers = [];
    this._parallelMode = 'default';
    this._projectConfig = void 0;
    this._loadError = void 0;
    this._fileId = void 0;
    this._type = void 0;
    this._type = type;
  }

  _addTest(test) {
    test.parent = this;
    this.tests.push(test);

    this._entries.push(test);
  }

  _addSuite(suite) {
    suite.parent = this;
    this.suites.push(suite);

    this._entries.push(suite);
  }

  allTests() {
    const result = [];

    const visit = suite => {
      for (const entry of suite._entries) {
        if (entry instanceof Suite) visit(entry);else result.push(entry);
      }
    };

    visit(this);
    return result;
  }

  titlePath() {
    const titlePath = this.parent ? this.parent.titlePath() : []; // Ignore anonymous describe blocks.

    if (this.title || this._type !== 'describe') titlePath.push(this.title);
    return titlePath;
  }

  _getOnlyItems() {
    const items = [];
    if (this._only) items.push(this);

    for (const suite of this.suites) items.push(...suite._getOnlyItems());

    items.push(...this.tests.filter(test => test._only));
    return items;
  }

  _clone() {
    const suite = new Suite(this.title, this._type);
    suite._only = this._only;
    suite.location = this.location;
    suite._requireFile = this._requireFile;
    suite._use = this._use.slice();
    suite._hooks = this._hooks.slice();
    suite._timeout = this._timeout;
    suite._annotations = this._annotations.slice();
    suite._modifiers = this._modifiers.slice();
    suite._parallelMode = this._parallelMode;
    suite._projectConfig = this._projectConfig;
    suite._skipped = this._skipped;
    return suite;
  }

  project() {
    var _this$parent;

    return this._projectConfig || ((_this$parent = this.parent) === null || _this$parent === void 0 ? void 0 : _this$parent.project());
  }

}

exports.Suite = Suite;

class TestCase extends Base {
  // Annotations that are not added from within a test (like fixme and skip), should not
  // be re-added each time we retry a test.
  constructor(title, fn, testType, location) {
    super(title);
    this.fn = void 0;
    this.results = [];
    this.location = void 0;
    this.parent = void 0;
    this.expectedStatus = 'passed';
    this.timeout = 0;
    this.annotations = [];
    this.retries = 0;
    this.repeatEachIndex = 0;
    this._testType = void 0;
    this.id = '';
    this._workerHash = '';
    this._pool = void 0;
    this._projectId = '';
    this._alreadyInheritedAnnotations = false;
    this.fn = fn;
    this._testType = testType;
    this.location = location;
  }

  titlePath() {
    const titlePath = this.parent ? this.parent.titlePath() : [];
    titlePath.push(this.title);
    return titlePath;
  }

  outcome() {
    const nonSkipped = this.results.filter(result => result.status !== 'skipped' && result.status !== 'interrupted');
    if (!nonSkipped.length) return 'skipped';
    if (nonSkipped.every(result => result.status === this.expectedStatus)) return 'expected';
    if (nonSkipped.some(result => result.status === this.expectedStatus)) return 'flaky';
    return 'unexpected';
  }

  ok() {
    const status = this.outcome();
    return status === 'expected' || status === 'flaky' || status === 'skipped';
  }

  _clone() {
    const test = new TestCase(this.title, this.fn, this._testType, this.location);
    test._only = this._only;
    test._requireFile = this._requireFile;
    test.expectedStatus = this.expectedStatus;
    test.annotations = this.annotations.slice();
    test._annotateWithInheritence = this._annotateWithInheritence;
    return test;
  }

  _annotateWithInheritence(annotations) {
    if (this._alreadyInheritedAnnotations) {
      this.annotations = annotations;
    } else {
      this._alreadyInheritedAnnotations = true;
      this.annotations = [...this.annotations, ...annotations];
    }
  }

  _appendTestResult() {
    const result = {
      retry: this.results.length,
      workerIndex: -1,
      duration: 0,
      startTime: new Date(),
      stdout: [],
      stderr: [],
      attachments: [],
      status: 'skipped',
      steps: [],
      errors: []
    };
    this.results.push(result);
    return result;
  }

}

exports.TestCase = TestCase;