# Numerical Optimization in Logistic Regression

考虑二分类对数几率回归，给定数据集 $\{(x_i, y_i)\}_{i=1}^N$，其中 $y_i \in \{0, 1\}$，条件概率由 Sigmoid 函数给出：

$$
p(y_i = 1 \mid x_i; w) = \sigma(w^\top x_i) = \frac{1}{1 + e^{-w^\top x_i}}
$$

## 二阶海森矩阵 (Hessian Matrix) 推导

负对数似然损失函数（交叉熵）写为：

$$
\ell(w) = -\sum_{i=1}^N \left[ y_i \log \mu_i + (1 - y_i) \log(1 - \mu_i) \right], \quad \mu_i = \sigma(w^\top x_i)
$$

对其求一阶梯度 $\nabla \ell(w)$ 与二阶海森矩阵 $H(w) = \nabla^2 \ell(w)$：

$$
\nabla \ell(w) = X^\top (\mu - y), \qquad H(w) = X^\top S X
$$

其中对角权重矩阵 $S = \text{diag}(\mu_1(1-\mu_1), \dots, \mu_N(1-\mu_N))$ 正定，保证了目标函数严格凸性，牛顿法迭代更新公式即等价于迭代重加权最小二乘（IRLS）：

$$
w^{(t+1)} = w^{(t)} - \left(X^\top S^{(t)} X\right)^{-1} X^\top (\mu^{(t)} - y)
$$
