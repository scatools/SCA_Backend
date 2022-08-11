const express = require('express');
const ExpressError = require('./expressError');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const db_user = require('./db_user');
const db_plan = require('./db_plan');
const SMAA_MCDA = require('./mcda');
const planRouter = require('./routes/plan');
const auth = require('./auth');
const { json } = require('express');
const email_validation = require("email-validator");

const app = express();

app.use(cors({credentials: true, origin: true}));
app.use(express.json());
app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/plan', planRouter);

/* Spatial Endpoints */

app.post('/data', async function(req, res, next) {
	try {
		// Set 4326 as the SRID for both geometries to avoid operations on mixed projections
		const results = await db.query(
			`SELECT gid,objectid,
			hab1,hab2,hab3,hab4,
			wq1,wq2,wq3,wq4,wq5,wq6,
			lcmr1,lcmr2,lcmr3,lcmr4,lcmr5,lcmr6,
			cl1,cl2,cl3,cl4,cl5,
			eco1,eco2,eco3,eco4,
			ST_AsGeoJSON(ST_SetSRID(geom, 4326)) AS geometry 
			FROM sca_landonly_withdata8_renamed 
			WHERE ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), ST_SetSRID(sca_landonly_withdata8_renamed.geom, 4326))`,
			[req.body.data]
		);
		
		const hexIDList = results.rows.map((hex) => {return parseInt(hex.objectid)});
		// console.log(hexIDList);
		// Use double quotes if there are capital letters in the column name
		const speciesCode = await db.query(
			`SELECT "SPPCodeNew" 
			FROM te_index 
			WHERE "OBJECTID" IN (`+ hexIDList.toString() +`)`
		);
		// Split and flatten the SPPCodeNew values into segments of 4 characters for the list of species codes
		var speciesCodeList = speciesCode.rows.map((code) => {
			return code.SPPCodeNew.match(/.{4}/g)
		}).flat();
		// Remove the duplicate codes
		speciesCodeList = [...new Set(speciesCodeList)];
		// console.log(speciesCodeList);

		// Use single quotes if there are capital letters in the string values
		const speciesName = await db.query(
			`SELECT "COMNAME" 
			FROM te_name 
			WHERE "SPPCodeNew" IN ('`+ speciesCodeList.join("','") +`')`
		);
		var speciesNameList = speciesName.rows.map((name) => {return name.COMNAME});
		speciesNameList = [...new Set(speciesNameList)];

		return res.json({
			length: results.rows.length,
			data: results.rows,
			speciesCode: speciesCodeList,
			speciesName: speciesNameList
		});
	} catch (e) {
		next(e);
		console.error(e); 
	}
});

/* Report Endpoints */

app.post('/mcda', async function(req, res, next) {
	try {
		const Init_mean = req.body.mean;
		const Init_std = req.body.std || 0.1;
		const result = await SMAA_MCDA(Init_mean,Init_std);
		return res.json(result);
	} catch (e) {
		next(e);
	}
});

app.get('/report', async function(req, res, next){
	try{
		return res.download('./report_template.html');
	} catch(e) {
		next(e);
	}
});

/* User Endpoints */

app.post('/register', async function(req, res, next){
	try{
		const data = await db_user.query(
			`SELECT EXISTS (SELECT username FROM user_new WHERE LOWER(username)=LOWER($1))::int`,
			[
				req.body.username,
			]
		)
		if(data.rows[0].exists === 0){
			const result = await auth.createUser(req.body.username, req.body.email, req.body.password)
			if(result.status === 'success'){
				await db_user.query(
					`INSERT INTO user_new(username, first_name, last_name, is_admin, uid)
					VALUES ($1, $2, $3, $4, $5)`,
					[
						req.body.username,
						req.body.first_name,
						req.body.last_name,
						false,
						result.info
					]
				)
				const token = await auth.createToken(result.info)
				if(token.status === 'success'){
					return res.json(auth.returnError(false, token.info))
				}
				else{
					return res.json(token)
				}
			}
			else{
				return res.json(result)
			}
		}
		else{
			return res.json(auth.returnError(true, 'Username already exists.'))
		}
		
	} catch(e) {
		next(e);
	}
});

app.post('/login', async function(req, res, next){
	// Get email from username
	try{
		// True means it's an email
		const email_or_user = email_validation.validate(req.body.username)
		let email_to_send = req.body.username
		if(email_or_user === false){
			const email = await db_user.query(
				`SELECT email FROM user_new WHERE username = $1`,
				[
					req.body.username,
				]
			)
			if(email.rows.length === 0){
				return res.json(auth.returnError(true, 'Username or password is incorrect'))
			}
			email_to_send = email.rows[0].email.replace(/(\r\n|\n|\r)/gm, "")
			
		}
		return res.json(auth.returnError(false, email_to_send))
	} catch(e) {
		next(e);
	}
});

app.post('/getUser', async function(req, res, next){
	try{
		const tokenVerification = await auth.verifyToken(req.body.idToken)
		if(tokenVerification.status === 'success'){
			let result = await db_user.query(
				`SELECT username, first_name, last_name
				FROM user_new
				WHERE uid = $1`,
				[tokenVerification.info.uid]
			);
			result.rows[0]['email'] = tokenVerification.info.email
			return res.json(auth.returnError(false, result.rows[0]))
		}
		else{
			return res.json(tokenVerification)
		}
	} catch(e) {
		next(e);
	}
});

app.get('/importUsers', async function(req, res, next){
	try{
		const result = await db_user.query(
			`SELECT * FROM user_new`
		);
		for(let val of result.rows){
			await auth.importUser(val.email, val.password, val.uid);
		};
		res.send(error);
	} catch(e) {
		next(e);
	}
});

app.post('/user', async function(req, res, next){
	try{
		const result = await db_user.query(
			`SELECT username, email, first_name, last_name, is_admin
			FROM users_new
			WHERE username = $1`,
			[req.body.username]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/user/shapefile', async function(req, res, next){
	try{
		const result = await db_user.query(
			`SELECT file_name, geometry
			FROM user_shapefile
			WHERE username = $1`,
			[req.body.username]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/user/report', async function(req, res, next){
	try{
		const result = await db_user.query(
			`SELECT report_name, script
			FROM user_report
			WHERE username = $1`,
			[req.body.username]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/user/plan', async function(req, res, next){
	try{
		const result = await db_plan.query(
			`SELECT plan_id
			FROM likes
			WHERE user_username = $1`,
			[req.body.username]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/update/information', async function(req, res, next){
	try{
		const token = await auth.verifyToken(req.body.token)
		if(token.status === 'success'){
			const data = await db_user.query(
				`SELECT EXISTS (SELECT email FROM user_new WHERE LOWER(email)=LOWER($1) AND uid != $2)::int`,
				[
					req.body.email,
					token.info.uid
				]
			)
			if(data.rows[0].exists === 0){
				try {
					await auth.updateInfo(token.info.uid, req.body.email)
					const result = await db_user.query(
						`UPDATE user_new
						SET email = $2, first_name = $3, last_name = $4
						WHERE uid = $1`,
						[
							token.info.uid,
							req.body.email,
							req.body.first_name,
							req.body.last_name
						]
					);
					return res.json(auth.returnError(false, ''));
				} catch (error) {
					return res.json(auth.returnError(true, 'Update failed')) 
				}
			}
			else{
				return res.json(auth.returnError(true, 'Email already exists'))
			}
		}
		else{
			
			return res.json(auth.returnError(true, 'Bad token')) 
		}	
	} catch(e) {
		next(e);
	}
});

app.post('/update/password', async function(req, res, next){
	try{
		const token = await auth.verifyToken(req.body.token)
		if(token.status === 'success'){	
			const pass_up = await auth.updatePassword(token.info.uid, req.body.password)
			if(pass_up.status === 'success'){
				return res.json(auth.returnError(false, ''));
			}
			else{
				return res.json(auth.returnError(true, pass_up.info));
			}
		}
		else{
			return res.json(auth.returnError(true, 'Bad token')) 
		}
	} catch(e) {
		next(e);
	}
});

app.post('/update/disable', async function(req, res, next){
	try{
		const token = await auth.verifyToken(req.body.token)
		if(token.status === 'success'){	
			const pass_up = await auth.disableAccount(token.info.uid)
			if(pass_up.status === 'success'){
				return res.json(auth.returnError(false, ''));
			}
			else{
				return res.json(auth.returnError(true, pass_up.info));
			}
		}
		else{
			return res.json(auth.returnError(true, 'Bad token')) 
		}
	} catch(e) {
		next(e);
	}
});

app.post('/save/shapefile', async function(req, res, next){
	try{
		const maxID = await db_user.query(
			`SELECT MAX(file_id) AS max_id
			FROM user_shapefile`
		);
		var new_id = 1;
		if (maxID.rows[0].max_id) {
			new_id = maxID.rows[0].max_id + 1;
		}
		const result = await db_user.query(
			`INSERT INTO user_shapefile(file_id, file_name, geometry, username)
			VALUES ($1, $2, $3, $4)`,
			[
				new_id,
				req.body.file_name,
				req.body.geometry,
				req.body.username
			]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/save/report', async function(req, res, next){
	try{
		const maxID = await db_user.query(
			`SELECT MAX(report_id) AS max_id
			FROM user_report`
		);
		var new_id = 1;
		if (maxID.rows[0].max_id) {
			new_id = maxID.rows[0].max_id + 1;
		}
		const result = await db_user.query(
			`INSERT INTO user_report(report_id, report_name, script, username)
			VALUES ($1, $2, $3, $4)`,
			[
				new_id,
				req.body.report_name,
				req.body.script,
				req.body.username
			]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/save/plan', async function(req, res, next){
	try{
		const maxID = await db_plan.query(
			`SELECT MAX(id) AS max_id
			FROM likes`
		);
		var new_id = 1;
		if (maxID.rows[0].max_id) {
			new_id = maxID.rows[0].max_id + 1;
		}
		const result = await db_plan.query(
			`INSERT INTO likes(id, user_username, plan_id)
			VALUES ($1, $2, $3)`,
			[
				new_id,
				req.body.username,
				req.body.plan_id
			]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/delete/shapefile', async function(req, res, next){
	try{
		const result = await db_user.query(
			`DELETE FROM user_shapefile
			WHERE file_name = $1`,
			[ req.body.file_name ]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/delete/report', async function(req, res, next){
	try{
		const result = await db_user.query(
			`DELETE FROM user_report
			WHERE report_name = $1`,
			[ req.body.report_name ]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/delete/plan', async function(req, res, next){
	try{
		const result = await db_plan.query(
			`DELETE FROM likes
			WHERE user_username = $1 AND plan_id = $2`,
			[ req.body.username, req.body.plan_id ]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

app.post('/getMeasures', async function(req, res, next){
	try{
		const weights = await db_user.query( `SELECT weight FROM public.user_weight WHERE username = $1`,
		[req.body.username]
		);
		res.json(weights.rows[0].weight)
	} catch(e) {
		next(e);
	}
});

app.post('/updateMeasures', async function(req, res, next){
	try{
		const result = await db_user.query(
			`UPDATE user_weight SET weight = $2 WHERE username = $1;`,
			[
				req.body.username,
				req.body.weights
			]
		);
		return res.json(result);
	} catch(e) {
		next(e);
	}
});

/* General Error Handler */

app.use(function(req, res, next) {
	const err = new ExpressError('Not Found', 404);

	// pass err to the next middleware
	return next(err);
});

app.use(function(err, req, res, next) {
	// the default status is 500 Internal Server Error
	let status = err.status || 500;

	// set the status and alert the user
	return res.status(status).json({
		error: {
			message: err.message,
			status: status
		}
	});
});

module.exports = app;
