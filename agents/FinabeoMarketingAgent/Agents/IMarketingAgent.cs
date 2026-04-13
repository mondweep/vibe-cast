using FinabeoMarketingAgent.Models;

namespace FinabeoMarketingAgent.Agents;

/// <summary>
/// Base interface for marketing agents
/// </summary>
public interface IMarketingAgent
{
    /// <summary>
    /// Execute the agent and return results
    /// </summary>
    Task<dynamic> ExecuteAsync();

    /// <summary>
    /// Agent name
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Agent description
    /// </summary>
    string Description { get; }
}

/// <summary>
/// Typed interface for agents with specific output types
/// </summary>
public interface IMarketingAgent<T> : IMarketingAgent
{
    /// <summary>
    /// Execute and return strongly-typed result
    /// </summary>
    Task<T> ExecuteAsyncTyped();
}
