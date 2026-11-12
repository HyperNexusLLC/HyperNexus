// HyperNexus Memory Skill
// Provides persistent memory across sessions

const fs = require("fs");
const path = require("path");
const os = require("os");

class MemorySkill {
	constructor() {
		this.configDir = path.join(os.homedir(), ".hypernexus");
		this.memoryFile = path.join(this.configDir, "memories.json");
		this.memories = [];
		this.loadMemories();
	}

	loadMemories() {
		try {
			if (fs.existsSync(this.memoryFile)) {
				const data = fs.readFileSync(this.memoryFile, "utf8");
				this.memories = JSON.parse(data);
			}
		} catch (error) {
			console.error("Failed to load memories:", error.message);
			this.memories = [];
		}
	}

	saveMemories() {
		try {
			if (!fs.existsSync(this.configDir)) {
				fs.mkdirSync(this.configDir, { recursive: true });
			}
			fs.writeFileSync(this.memoryFile, JSON.stringify(this.memories, null, 2));
		} catch (error) {
			console.error("Failed to save memories:", error.message);
		}
	}

	save(content, tags = [], importance = 5) {
		const memory = {
			id: Date.now().toString(),
			content,
			tags,
			importance,
			timestamp: new Date().toISOString(),
			accessCount: 0,
		};

		this.memories.push(memory);
		this.saveMemories();

		return memory;
	}

	search(query, limit = 10) {
		const queryLower = query.toLowerCase();
		const results = this.memories
			.filter((memory) => {
				const contentMatch = memory.content.toLowerCase().includes(queryLower);
				const tagMatch = memory.tags.some((tag) =>
					tag.toLowerCase().includes(queryLower),
				);
				return contentMatch || tagMatch;
			})
			.sort((a, b) => {
				// Sort by importance (descending) then by timestamp (newest first)
				if (a.importance !== b.importance) {
					return b.importance - a.importance;
				}
				return new Date(b.timestamp) - new Date(a.timestamp);
			})
			.slice(0, limit);

		// Increment access count for searched memories
		results.forEach((memory) => {
			memory.accessCount++;
		});
		this.saveMemories();

		return results;
	}

	list(limit = 50) {
		return this.memories
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.slice(0, limit);
	}

	get(id) {
		return this.memories.find((memory) => memory.id === id);
	}

	delete(id) {
		const index = this.memories.findIndex((memory) => memory.id === id);
		if (index !== -1) {
			this.memories.splice(index, 1);
			this.saveMemories();
			return true;
		}
		return false;
	}

	export() {
		return {
			memories: this.memories,
			count: this.memories.length,
			exportedAt: new Date().toISOString(),
		};
	}

	import(data) {
		if (data.memories && Array.isArray(data.memories)) {
			this.memories = [...this.memories, ...data.memories];
			this.saveMemories();
			return true;
		}
		return false;
	}
}

module.exports = MemorySkill;
