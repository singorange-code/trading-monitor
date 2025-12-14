"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SnapshotStorage_1 = require("../services/SnapshotStorage");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const snapshotStorage = new SnapshotStorage_1.SnapshotStorage();
// 获取单个快照
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await snapshotStorage.getSnapshot(id);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        return res.json(snapshot);
    }
    catch (error) {
        logger_1.logger.error('Failed to get snapshot:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// 获取快照列表
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const snapshots = await snapshotStorage.listSnapshots(limit);
        res.json({
            snapshots: snapshots.map(s => ({
                id: s.id,
                symbol: s.symbol,
                opportunities: s.opportunities.length,
                timestamp: s.timestamp
            })),
            total: snapshots.length
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list snapshots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// 获取存储统计
router.get('/stats/storage', async (_req, res) => {
    try {
        const stats = await snapshotStorage.getStorageStats();
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Failed to get storage stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=snapshots.js.map