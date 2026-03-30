/**
 * LLM Client Interface and Mock Implementation
 * Traceability: TASK-003 -> SPEC-001 Section 2.2
 */

/** A single message in a conversation */
export interface Message {
  role: string;
  content: string;
}

/** Options for LLM completion calls */
export interface LLMCompletionOptions {
  temperature?: number;
  timeout?: number;
}

/**
 * Abstract interface for LLM providers.
 * Allows mocking in tests and swapping providers.
 */
export interface LLMClient {
  complete(
    messages: Message[],
    options?: LLMCompletionOptions,
  ): Promise<string>;
}

/**
 * Mock LLM client for testing.
 * Returns configurable responses or throws configurable errors.
 */
export class MockLLMClient implements LLMClient {
  private responses: string[] = [];
  private callIndex = 0;
  private _calls: { messages: Message[]; options?: LLMCompletionOptions }[] = [];

  /** All calls made to this mock, for assertion purposes */
  get calls(): { messages: Message[]; options?: LLMCompletionOptions }[] {
    return this._calls;
  }

  /**
   * Set one or more responses to return in sequence.
   * If more calls are made than responses, the last response is repeated.
   */
  setResponses(...responses: string[]): void {
    this.responses = responses;
    this.callIndex = 0;
  }

  async complete(
    messages: Message[],
    options?: LLMCompletionOptions,
  ): Promise<string> {
    this._calls.push({ messages, options });

    if (this.responses.length === 0) {
      throw new Error("MockLLMClient: no responses configured");
    }

    const index = Math.min(this.callIndex, this.responses.length - 1);
    const response = this.responses[index];
    this.callIndex++;

    if (response === "__TIMEOUT__") {
      throw new Error("LLM request timed out");
    }

    return response;
  }

  /** Reset call history and responses */
  reset(): void {
    this.responses = [];
    this.callIndex = 0;
    this._calls = [];
  }
}
