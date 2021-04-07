import "./App.css";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { useEffect, useState } from "react";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

function App() {
	const [tableData, setTableData] = useState([]);
	const [priceThreshold, setPriceThreshold] = useState(0);
	const [updateFrequency, setUpdateFrequency] = useState(0);
	const [streaming, setStreaming] = useState(false);
	const [startRange, setStartRange] = useState(0);
	const [endRange, setEndRange] = useState(0);
	const [historicalData, setHistoricalData] = useState([]);

	useEffect(() => {
		if (streaming === true) {
			return;
		}
		const sse = new EventSource("http://127.0.0.1:80/stream");
		sse.onmessage = (e) => {
			let newPrices = [...JSON.parse(e.data), ...tableData].slice(0, 500);
			setTableData(newPrices);
		};
		return () => {
			sse.close();
			setStreaming(false);
		};
	});

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginTop: 10,
						width: "50%",

						alignItems: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							padding: 50,
						}}
					>
						<TextField
							label="threshold"
							variant="filled"
							value={priceThreshold}
							onChange={(e) => {
								setPriceThreshold(Number(e.target.value));
							}}
							style={{ marginRight: 5 }}
						/>
						<div
							style={{ display: "flex", flexDirection: "column" }}
						>
							<TextField
								id="filled-basic"
								label="frequency"
								variant="filled"
								value={updateFrequency}
								type="number"
								onChange={(e) => {
									setUpdateFrequency(Number(e.target.value));
								}}
							/>
							<Button
								onClick={() => {
									if (updateFrequency < 1) {
										return;
									}
									const requestOptions = {
										method: "POST",
										mode: "no-cors",
										headers: {
											Accept: "application/json",
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											frequency: updateFrequency,
										}),
									};
									fetch(
										"http://localhost:80/updateFrequency",
										requestOptions
									).then((response) => {
										console.log(response);
									});
								}}
								variant="contained"
							>
								Update Frequency
							</Button>
						</div>
					</div>

					<TableContainer style={{ width: "80%" }} component={Paper}>
						<Table aria-label="simple table">
							<TableHead>
								<TableRow>
									<TableCell align="center">Ticker</TableCell>
									<TableCell align="center">Price</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{tableData.map((row, index) => (
									<TableRow key={index}>
										<TableCell align="center">
											{row.symbol}
										</TableCell>
										<TableCell
											style={{
												backgroundColor:
													priceThreshold > 0
														? row.price >
														  priceThreshold
															? "green"
															: row.price <
															  priceThreshold
															? "red"
															: "white"
														: "white",
											}}
											align="center"
										>
											{row.price}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginTop: 10,
						width: "50%",

						alignItems: "center",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							padding: 50,
						}}
					>
						<TextField
							label="start"
							variant="filled"
							value={startRange}
							onChange={(e) => {
								setStartRange(Number(e.target.value));
							}}
							style={{ marginRight: 5 }}
						/>
						<div>
							<TextField
								label="end"
								variant="filled"
								value={endRange}
								onChange={(e) => {
									setEndRange(Number(e.target.value));
								}}
								style={{ marginRight: 5 }}
							/>
							<Button
								onClick={() => {
									if (endRange > 5) {
										return;
									}

									if (startRange >= endRange) {
										return;
									}

									const requestOptions = {
										method: "POST",
										// mode: "no-cors",
										headers: {
											Accept: "application/json",
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											start: startRange,
											end: endRange,
										}),
									};
									fetch(
										"http://localhost:80/getData",
										requestOptions
									).then((response) => {
										response.json().then((val) => {
											setHistoricalData(val);
										});
									});
								}}
								variant="contained"
							>
								Update Time Range
							</Button>
						</div>
					</div>

					<TableContainer
						// style={{ marginTop: 20, padding: 20 }}
						style={{ width: "80%" }}
						component={Paper}
					>
						<Table aria-label="simple table">
							<TableHead>
								<TableRow>
									<TableCell align="center">Ticker</TableCell>
									<TableCell align="center">Price</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{historicalData.map((row, index) => (
									<TableRow key={index}>
										<TableCell align="center">
											{row[1]}
										</TableCell>
										<TableCell
											style={{
												backgroundColor:
													priceThreshold > 0
														? row.price >
														  priceThreshold
															? "green"
															: row.price <
															  priceThreshold
															? "red"
															: "white"
														: "white",
											}}
											align="center"
										>
											{row[2]}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</div>
			</div>
		</div>
	);
}

export default App;
