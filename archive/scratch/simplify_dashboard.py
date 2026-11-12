import re

def main():
    filepath = "apps/web/src/app/dashboard/dashboard-home-view.tsx"
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # 1. Inject state hook
    state_injection = """export function DashboardHomeView({
    generatedAtLabel,
    currentTimestamp,
    isBootstrapping = false,
    mcpStatus,
    startupStatus,
    servers,
    traffic,
    providers,
    fallbackChain,
    sessions,
    healerStatus,
    installSurfaceArtifacts,
    onStartSession,
    onStopSession,
    onRestartSession,
    pendingSessionActionId,
    children,
}: DashboardHomeViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'cli' | 'healer'>('overview');"""
    
    content = content.replace("export function DashboardHomeView({\n    generatedAtLabel,\n    currentTimestamp,\n    isBootstrapping = false,\n    mcpStatus,\n    startupStatus,\n    servers,\n    traffic,\n    providers,\n    fallbackChain,\n    sessions,\n    healerStatus,\n    installSurfaceArtifacts,\n    onStartSession,\n    onStopSession,\n    onRestartSession,\n    pendingSessionActionId,\n    children,\n}: DashboardHomeViewProps) {", state_injection)
    
    # 2. Inject Tab Navigation bar after </header>
    header_end = "</header>"
    tab_nav = """</header>

                {/* Tab Navigation */}
                <div className="mt-2 flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 text-sm font-semibold tracking-wide border-b-2 transition ${
                            activeTab === 'overview'
                                ? 'border-cyan-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Overview & Posture
                    </button>
                    <button
                        onClick={() => setActiveTab('servers')}
                        className={`px-4 py-3 text-sm font-semibold tracking-wide border-b-2 transition ${
                            activeTab === 'servers'
                                ? 'border-cyan-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        MCP Servers & Traffic
                    </button>
                    <button
                        onClick={() => setActiveTab('cli')}
                        className={`px-4 py-3 text-sm font-semibold tracking-wide border-b-2 transition ${
                            activeTab === 'cli'
                                ? 'border-cyan-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        CLI Runtime
                    </button>
                    <button
                        onClick={() => setActiveTab('healer')}
                        className={`px-4 py-3 text-sm font-semibold tracking-wide border-b-2 transition ${
                            activeTab === 'healer'
                                ? 'border-cyan-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Immunology & Healer
                    </button>
                </div>"""
                
    content = content.replace(header_end, tab_nav)
    
    # 3. Now let's wrap each section using a safe replacement strategy based on unique content inside the file
    
    # Wrap Section 1: Router posture
    sec1_start = '<section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">\n                        <div className="flex items-start justify-between gap-4">\n                            <div>\n                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Overview</p>\n                                <h2 className="mt-2 text-xl font-semibold text-white">Router posture</h2>'
    sec1_wrapped = '{activeTab === \'overview\' && (\n                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">\n                        <div className="flex items-start justify-between gap-4">\n                            <div>\n                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Overview</p>\n                                <h2 className="mt-2 text-xl font-semibold text-white">Router posture</h2>'
    content = content.replace(sec1_start, sec1_wrapped)
    
    # Close Section 1 before Section 2
    sec1_to_sec2 = """                                <span className="font-semibold text-slate-200">Client config sync</span>: Push endpoints to Cursor, Claude, and VS Code.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">MCP Router</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Server health and traffic</h2>"""
                                
    sec1_to_sec2_wrapped = """                                <span className="font-semibold text-slate-200">Client config sync</span>: Push endpoints to Cursor, Claude, and VS Code.
                                </div>
                            </div>
                        </div>
                    </section>
                    )}

                    {activeTab === 'servers' && (
                    <section className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">MCP Router</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Server health and traffic</h2>"""
                                
    content = content.replace(sec1_to_sec2, sec1_to_sec2_wrapped)
    
    # Close Section 2 before Section 3
    sec2_to_sec3 = """                                        <div className="mt-2 text-xs text-slate-500">Latency {event.latencyMs}ms</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Sessions</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Supervised CLI runtime</h2>"""
                                
    sec2_to_sec3_wrapped = """                                        <div className="mt-2 text-xs text-slate-500">Latency {event.latencyMs}ms</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    )}

                    {activeTab === 'cli' && (
                    <section className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Sessions</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Supervised CLI runtime</h2>"""
                                
    content = content.replace(sec2_to_sec3, sec2_to_sec3_wrapped)

    # Close Section 3 before Section 4
    sec3_to_sec4 = """                                                    {isPending ? 'Working…' : 'Restart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Providers</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Quota and fallback posture</h2>"""
                                
    sec3_to_sec4_wrapped = """                                                    {isPending ? 'Working…' : 'Restart'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    )}

                    {activeTab === 'overview' && (
                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Providers</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Quota and fallback posture</h2>"""
                                
    content = content.replace(sec3_to_sec4, sec3_to_sec4_wrapped)

    # Close Section 4 before Section 5
    sec4_to_sec5 = """                                        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">priority {entry.priority}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Immune System</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Autonomous healer status</h2>"""
                                
    sec4_to_sec5_wrapped = """                                        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">priority {entry.priority}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    )}

                    {activeTab === 'healer' && (
                    <section className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Immune System</p>
                                <h2 className="mt-2 text-xl font-semibold text-white">Autonomous healer status</h2>"""
                                
    content = content.replace(sec4_to_sec5, sec4_to_sec5_wrapped)

    # Close Section 5 before children
    sec5_to_end = """                        </div>
                    </section>
                    {children}
                </div>"""
                
    sec5_to_end_wrapped = """                        </div>
                    </section>
                    )}
                    {children}
                </div>"""
                
    content = content.replace(sec5_to_end, sec5_to_end_wrapped)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Dashboard Home View refactoring successfully applied!")

if __name__ == "__main__":
    main()
