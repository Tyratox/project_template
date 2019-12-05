import matplotlib.pyplot as plt
import numpy as np
import csv

# -------------------- Data Parsing --------------------

# Read n lines in the specified csv file and filter data at index of the specified tag
def getData(start, end, file, tag) :
	Data = []

	with open(file, newline='') as csvfile:
		curr = list(csv.reader(csvfile, delimiter=','))
		for i in range(start, end):
			index = curr[0].index(tag)
			Data.append(float(curr[i][index]))
	return Data

# -------------------- Plot functions --------------------

# Plot Data with optional x and y error and saves file as name.svg
def plot(dataX, dataY, xLabel, yLabel, name, errX=None, errY=None) :
	plt.figure(figsize=[11, 8])
	plt.errorbar(dataX, dataY, xerr=errX, yerr=errY, fmt='rx', elinewidth=1, capsize=5)

	# Naming Axes and Title
	plt.ylabel(yLabel)
	plt.xlabel(xLabel)
	plt.suptitle(name)

	#plt.gca().set_position([0, 0, 1, 1])
	fileName = name + ".svg"
	plt.savefig(fileName)

def plotMultipleSets(nrSets, color, dataX, dataY, xLabel, yLabel, name, errX, errY, lables) :
	plt.figure(figsize=[11, 8])
	for i in range(0, nrSets) :
		plt.errorbar(dataX[i], dataY[i], fmt=color[i], yerr=errY[i], elinewidth=1, capsize=5, label=lables[i])

	# Naming Axes and Title
	plt.ylabel(yLabel)
	plt.xlabel(xLabel)
	plt.suptitle(name)
	plt.legend(loc='best')

	#plt.gca().set_position([0, 0, 1, 1])
	fileName = name + ".svg"
	plt.savefig(fileName)

# -------------------- Experiment 1 --------------------

# Plot 1: [Time] : [Mean Speed]
def expOnePlotOne() : 
	# Nr of Tests with different parameters
	nrTests = 9
	# Nr of Tests with same parameters
	n = 5
	# Data Arrays for plot
	dataX = []
	dataY = []
	# Standard deviation for x and y axis
	stX = []
	stY = []

	for i in range(0, nrTests) :
		currPlotFile = './Exp_1_Plot_1_Presets_' + str(i + 1) + '.csv'

		# Get Data for x axis 
		meanVelocity = getData(start=1, end=n, file=currPlotFile, tag='MEAN_DUDE_DESIRED_VELOCITY')
		# Add the mean over all n runs with the same parameters to the x axis
		dataX.append(np.mean(meanVelocity, dtype=np.float64))
		
		time = getData(start=1, end=n, file=currPlotFile, tag='TIME')
		# Add the mean over all n runs with the same parameters to the y axis
		dataY.append(np.mean(time, dtype=np.float64))
		# Calculate the standard deviation for the y axis
		stY.append(np.std(time))

	plot(dataX=dataX, dataY=dataY, xLabel="Mean Desired Velocity", yLabel="Time [s]", name="Exp_1_Plot_1", errX=None ,errY=stY)

# Plot 2: [Agents per Time] : [Mean Speed]
def expOnePlotTwo() :
	# Nr of Tests with different parameters
	nrTests = 6
	# Nr of Tests with same parameters
	n = 5
	# Data Arrays for plot
	dataX = []
	dataY = []
	# Standard deviation for x and y axis
	stX = []
	stY = []

	for i in range(0, nrTests) :
		currPlotFile = './Exp_1_Plot_2_Presets_' + str(i + 1) + '.csv'

		# Get Data for x and y axis
		meanVelocity = getData(start=1, end=n, file=currPlotFile, tag='MEAN_DUDE_DESIRED_VELOCITY')
		meanVelocitySD = getData(start=1, end=n, file=currPlotFile, tag='DUDE_DESIRED_VELOCITY_STD_DEV')
		nrOfAgents = getData(start=1, end=n, file=currPlotFile, tag='AGENTS_TOTAL')

		# Add the mean over all n runs with the same parameters to the x axis
		dataX.append(
			np.mean(np.true_divide(meanVelocity, nrOfAgents),
			dtype=np.float64)
		)

		# Calculate the standard deviation for the x axis
		stX.append(
			np.std(np.true_divide(meanVelocity, nrOfAgents))	
		)

		# Add the mean over all n runs with the same parameters to the y axis
		dataY.append(np.mean(meanVelocity, dtype=np.float64))
		# Calculate the standard deviation for the y axis
		stY.append(np.mean(meanVelocitySD))

	plot(dataX=dataX, dataY=dataY, xLabel="Escaped Agents per Time", yLabel="Mean Desired Velocity", name="Exp_1_Plot_2", errX=stX ,errY=None)

# Plot 2: [Nr of Agents escaping per Time / Speed - Ratio] : [Mean Speed]
def expOnePlotTwo2() :
	# Nr of Tests with different primary parameter
	nrTests = 6
	# Nr of Tests with different secondary parameter
	n = 5
	# Data Arrays for plot
	dataX = []
	dataY = []
	# Standard deviation for x and y axis
	stX = []
	stY = []
	color = ['rx', 'bx', 'gx', 'yx', 'rx', 'rx', 'rx', 'rx']

	for i in range(0, nrTests) :
		currPlotFile = './Exp_1_Plot_2_Presets_' + str(i + 1) + '.csv'
			
		# Get Data for x and y axis
		meanVelocity = getData(start=1, end=n, file=currPlotFile, tag='MEAN_DUDE_DESIRED_VELOCITY')
		meanVelocitySD = getData(start=1, end=n, file=currPlotFile, tag='DUDE_DESIRED_VELOCITY_STD_DEV')
		nrOfAgents = getData(start=1, end=n, file=currPlotFile, tag='AGENTS_TOTAL')
		

		# Add the data for all n runs with the same primary parameter to the x axis
		dataX.append(np.true_divide(meanVelocity, nrOfAgents))

		# Add the data for all n runs with the same primary parameters to the y axis
		dataY.append(meanVelocity)

	plotMultipleSets(nrSets=n, color=color, dataX=dataX, dataY=dataY, xLabel="Escaped Agents per Time", yLabel="Mean Desired Velocity", name="Exp_1_Plot_2_V2", errX=None ,errY=None)


# Plot 3:  (Time - Mean Velocity)

# -------------------- Experiment 2 --------------------

# Plot 1: [Time] : [Mean Speed]
def expTwoPlotOne() : 
	# Nr of Tests with different primary parameter
	nrTests = 3
	# Nr of Tests with different secondary parameter
	n = 2
	# Data Arrays for plot
	dataX = []
	dataY = []
	# Standard deviation for x and y axis
	stX = []
	stY = []
	color = ['ro-', 'bo-', 'go-', 'yo-', 'ro-', 'ro-', 'ro-', 'ro-']
	lables = ['Wide Hallway', 'Narrow Hallway', 'Narrow Hallway, large Exit']

	for i in range(0, nrTests) :
		currX = []
		currYstd = []
		currY = []
		for j in range(1, n + 1) : 
			currPlotFile = './Exp_2_Plot_1_Presets_' + str(i * n + j) + '.csv'
			# Get Data for x and y axis
			meanVelocity = getData(start=1, end=nrTests + 1, file=currPlotFile, tag='MEAN_DUDE_DESIRED_VELOCITY')
			meanVelocitySD = getData(start=1, end=nrTests + 1, file=currPlotFile, tag='DUDE_DESIRED_VELOCITY_STD_DEV')
			time = getData(start=1, end=nrTests + 1, file=currPlotFile, tag='TIME')
			currX.append(np.mean(meanVelocity, dtype=np.float64))
			currY.append(np.mean(time, dtype=np.float64))
			currYstd.append(np.std(time))
		
		# Add the data for all n runs with the same primary parameter to the x axis
		dataX.append(currX)

		# Add the standard deviation of the x axis
		stY.append(currYstd)

		# Add the data for all n runs with the same primary parameters to the y axis
		dataY.append(currY)

	plotMultipleSets(nrSets=nrTests, color=color, dataX=dataX, dataY=dataY, xLabel="Mean Desired Velocity", yLabel="Time [s]", name="Exp_2_Plot_1", errX=stX ,errY=stY, lables=lables)

# Plot 2:

def main() :
	expOnePlotOne()
	#expOnePlotTwo()
	#expTwoPlotOne()


main()
