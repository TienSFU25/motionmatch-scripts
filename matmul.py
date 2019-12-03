import numpy as np;
import math;
from math import sin, cos;

T = np.array([6.1350998878479, 52.95589828491211, 5.795400142669678])

# our inverse shit
_A = [[-0.9680819511413574, 0.08188959211111069, 0.2368728220462799],
[-0.08188959211111069, 0.789893388748169, -0.6077517867088318],
[-0.2368728220462799, -0.6077517867088318, -0.7579754590988159]]
A = np.array(_A)

# online ver
_A2 = [[ -0.9689659, -0.0507814,  0.2419219],
  [-0.0813883,  0.9896429, -0.1182493],
  [-0.2334114, -0.1342692, -0.9630633 ]]
A2 = np.array(_A2)

# try Euler?
def eulerToRotation(tx, ty, tz):
    Rx = np.array([[ 1, 0, 0],
                    [0, cos(tx), -sin(tx)],
                    [0, sin(tx), cos(tx) ]])

    Ry = np.array([[ cos(ty), 0, sin(ty)],
                    [0, 1, 0],
                    [-sin(ty), 0, cos(ty)]])

    Rz = np.array([[ cos(tz), -sin(tz), 0],
                    [sin(tz), cos(tz), 0],
                    [0, 0, 1]])

    # return np.matmul(Rx, np.matmul(Ry, Rz))
    R = np.dot(Rz, np.dot( Ry, Rx ))
 
    return R

AE = eulerToRotation(-2.465749, 0.239, -3.057)
# AE = eulerToRotation(-3.057, 0.239, -2.465749)
A2E = eulerToRotation(3.0194196, 0.2443461, 3.0892328)
# A2E = eulerToRotation(3.08, 0.244, 3.01)

B = np.array([3.64, 0, 0])

AB = np.matmul(A, B)
A2B = np.matmul(A2, B)
AEB = np.matmul(AE, B)
A2EB = np.matmul(A2E, B)

print(AB)
print(A2B)
print(AEB)
print(A2EB)


theta1 = math.atan2(0.004, -0.64) 
theta2 = math.atan2(-0.004, -0.64) 
print("atan2(0.004, -0.64) : ", theta1)  
print("atan2(-0.004, -0.64) : ", theta2)