import {
	pgTable,
	uuid,
	varchar,
	timestamp,
	integer,
	boolean,
	text,
	inet,
	jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).unique().notNull(),
	name: varchar("name", { length: 255 }),
	passwordHash: varchar("password_hash", { length: 255 }),
	oauthProvider: varchar("oauth_provider", { length: 50 }),
	oauthId: varchar("oauth_id", { length: 255 }),
	apiKey: varchar("api_key", { length: 64 }).unique(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Licenses table
export const licenses = pgTable("licenses", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	licenseKey: varchar("license_key", { length: 64 }).unique().notNull(),
	licenseType: varchar("license_type", { length: 50 }).notNull(),
	status: varchar("status", { length: 20 }).default("active"),
	maxSeats: integer("max_seats").default(1),
	usedSeats: integer("used_seats").default(0),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	licenseId: uuid("license_id").references(() => licenses.id, {
		onDelete: "cascade",
	}),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	planId: varchar("plan_id", { length: 50 }).notNull(),
	status: varchar("status", { length: 20 }).default("active"),
	currentPeriodStart: timestamp("current_period_start"),
	currentPeriodEnd: timestamp("current_period_end"),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

// Devices table
export const devices = pgTable("devices", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	licenseId: uuid("license_id").references(() => licenses.id, {
		onDelete: "cascade",
	}),
	deviceId: varchar("device_id", { length: 255 }).notNull(),
	deviceName: varchar("device_name", { length: 255 }),
	deviceType: varchar("device_type", { length: 50 }),
	lastSeenAt: timestamp("last_seen_at").defaultNow(),
	createdAt: timestamp("created_at").defaultNow(),
});

// Memory sync table
export const memorySync = pgTable("memory_sync", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
	memoryKey: varchar("memory_key", { length: 255 }).notNull(),
	memoryValue: text("memory_value"),
	encrypted: boolean("encrypted").default(false),
	syncedAt: timestamp("synced_at").defaultNow(),
	createdAt: timestamp("created_at").defaultNow(),
});

// Audit log
export const auditLog = pgTable("audit_log", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
	action: varchar("action", { length: 100 }).notNull(),
	resourceType: varchar("resource_type", { length: 50 }),
	resourceId: varchar("resource_id", { length: 255 }),
	metadata: jsonb("metadata"),
	ipAddress: inet("ip_address"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	licenses: many(licenses),
	subscriptions: many(subscriptions),
	devices: many(devices),
	memorySync: many(memorySync),
}));

export const licensesRelations = relations(licenses, ({ one, many }) => ({
	user: one(users, { fields: [licenses.userId], references: [users.id] }),
	subscription: many(subscriptions),
	devices: many(devices),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
	license: one(licenses, {
		fields: [subscriptions.licenseId],
		references: [licenses.id],
	}),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
	user: one(users, { fields: [devices.userId], references: [users.id] }),
	license: one(licenses, {
		fields: [devices.licenseId],
		references: [licenses.id],
	}),
}));
