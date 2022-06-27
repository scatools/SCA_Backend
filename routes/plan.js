var express = require('express');
var router = express.Router();

const db_plan = require('../db_plan');

const timeframeHash = {
	All: '1=1',
	'5': `plan_timeframe > '${new Date().getFullYear() - 5}'`,
	'10': `plan_timeframe > '${new Date().getFullYear() - 10}' AND plan_timeframe < '${new Date().getFullYear() - 5}'`,
	'10+': `plan_timeframe < '${new Date().getFullYear() - 10}'`
};
const priorityHash = {
	All: '1=1',
	Hab: `habitat IS NOT NULL`,
	WQ: `water_quality IS NOT NULL`,
	LCMR: `resources_species IS NOT NULL`,
	CR: `community_resilience IS NOT NULL`,
	ER: `ecosystem_resilience IS NOT NULL`,
	ECO: `gulf_economy IS NOT NULL`
};
const stateHash = {
	All: 'related_state IS NOT NULL',
	FL: `related_state = 'FL'`,
	AL: `related_state = 'AL'`,
	MS: `related_state = 'MS'`,
	LA: `related_state = 'LA'`,
	TX: `related_state = 'TX'`,
	SE: `related_state = 'SE'`
};

router.get('/spatial/point', async function(req, res, next) {
	try {
		const filterConfig = {
			state: stateHash[String(req.query.state)] || '1=1',
			time: timeframeHash[String(req.query.time)] || '1=1',
			priority: priorityHash[String(req.query.priority)] || '1=1'
		};

		const spatialPointInput = JSON.stringify({
			type: 'Point',
			coordinates: [ req.query.lng, req.query.lat ]
		});

		const spatialQueryResults = await db_plan.query(
			`SELECT name FROM spatial WHERE ST_Intersects(ST_GeomFromGeoJSON(ST_AsGeoJSON(geom)), ST_GeomFromGeoJSON('${spatialPointInput}'))`
		);
		
		const filteredSpatialQueryResultsString = spatialQueryResults.rows.map((row) => `'${row.name === "SE" ? "Regional" : row.name}'`).join(' , ');

		if (filteredSpatialQueryResultsString) {
			const results = await db_plan.query(
				`SELECT plan_name, id, related_state FROM plans WHERE (${filterConfig.state}) AND (${filterConfig.time}) AND (${filterConfig.priority}) AND (geo_extent IN (${filteredSpatialQueryResultsString}));`
			);
			return res.json({
				totalRowCount: results.rowCount || 0,
				data:
					results.rows.filter(
						(ele, index) => index >= Number(req.query.start) && index < Number(req.query.end)
					) || []
			});
		} else {
			return res.json({
				totalRowCount: 0,
				data: []
			});
		}
	} catch (e) {
		console.log(e);
		next(e);
	}
});

router.get('/spatial/polygon', async function(req, res, next) {
	try {
		const filterConfig = {
			state: stateHash[String(req.query.state)] || '1=1',
			time: timeframeHash[String(req.query.time)] || '1=1',
			priority: priorityHash[String(req.query.priority)] || '1=1'
		};

		const spatialPolygonInput = JSON.stringify({
			type: "MultiPolygon",
			coordinates: JSON.parse(req.query.coordinates)
		});

		const spatialQueryResults = await db_plan.query(
			`SELECT name FROM spatial WHERE ST_Intersects(ST_GeomFromGeoJSON(ST_AsGeoJSON(geom)), ST_GeomFromGeoJSON('${spatialPolygonInput}'))`
		);
		
		const filteredSpatialQueryResultsString = spatialQueryResults.rows.map((row) => `'${row.name === "SE" ? "Regional" : row.name}'`).join(' , ');

		if (filteredSpatialQueryResultsString) {
			const results = await db_plan.query(
				`SELECT plan_name, id, related_state FROM plans WHERE (${filterConfig.state}) AND (${filterConfig.time}) AND (${filterConfig.priority}) AND (geo_extent IN (${filteredSpatialQueryResultsString}));`
			);
			return res.json({
				totalRowCount: results.rowCount || 0,
				data:
					results.rows.filter(
						(ele, index) => index >= Number(req.query.start) && index < Number(req.query.end)
					) || []
			});
		} else {
			return res.json({
				totalRowCount: 0,
				data: []
			});
		}
	} catch (e) {
		console.log(e);
		next(e);
	}
});

router.get('/:num', async function(req, res, next) {
	try {
		const results = await db_plan.query(`SELECT * FROM plans WHERE id = $1; `, [ Number(req.params.num) ]);
		return res.json({
			data: results.rows
		});
	} catch (e) {
		next(e);
	}
});

router.get('/', async function(req, res, next) {
	try {
		const filterConfig = {
			state: stateHash[String(req.query.state)] || '1=1',
			time: timeframeHash[String(req.query.time)] || '1=1',
			priority: priorityHash[String(req.query.priority)] || '1=1'
		};

		const results = await db_plan.query(
			`SELECT plan_name, id, plan_url, plan_timeframe, planning_method, agency_lead FROM plans WHERE (${filterConfig.state}) AND (${filterConfig.time}) AND (${filterConfig.priority});`
		);
		return res.json({
			totalRowCount: results.rowCount || 0,
			data: results.rows.filter((ele, index) => index >= Number(req.query.start) && index < Number(req.query.end))
		});
	} catch (e) {
		console.log(e);
		next(e);
	}
});

module.exports = router;
