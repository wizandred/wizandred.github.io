# Information Bottleneck & Parsimonious Representation

在表示学习（Representation Learning）中，我们希望从高维观测数据 $X \in \mathbb{R}^D$ 中提取低维紧致特征 $Z \in \mathbb{R}^d$（其中 $d \ll D$），使得 $Z$ 最大限度保留关于目标变量 $Y$ 的预测信息，同时剔除冗余噪声。

## 1. 变分信息瓶颈 (Variational Information Bottleneck)

信息瓶颈（IB）的目标函数定义为最大化互信息项与压缩正则项的权衡：

$$
\mathcal{L}_{\text{IB}}(\theta) = I(Z; Y) - \beta I(Z; X)
$$

其中 $\beta > 0$ 为控制压缩率与任务表征能力的拉格朗日乘子。利用变分下界（Variational Lower Bound），我们可以将上式转化为可微分的损失函数：

$$
\mathcal{L}_{\text{VIB}} = \mathbb{E}_{q_\theta(z|x)} [\log p_\phi(y|z)] - \beta \, D_{\text{KL}}\left(q_\theta(z|x) \,\|\, r(z)\right)
$$

> **核心直觉**：当编码分布 $q_\theta(z|x)$ 趋向于先验分布 $r(z) = \mathcal{N}(0, I)$ 时，特征空间满足最小充分统计量（Minimal Sufficient Statistic）性质。

## 2. 编码率缩减 (Coding Rate Reduction)

对于无监督与自监督场景，给定特征矩阵 $Z = [z_1, z_2, \dots, z_m] \in \mathbb{R}^{d \times m}$，在高斯失真度 $\epsilon^2$ 下所需的平均比特数（Coding Rate）可由以下行列式解析表达：

$$
R(Z, \epsilon) = \frac{1}{2} \log \det \left( I + \frac{d}{m \epsilon^2} Z Z^\top \right)
$$

```python
import torch

def coding_rate(Z: torch.Tensor, eps: float = 0.1) -> torch.Tensor:
    """计算特征矩阵 Z 的编码率 R(Z, eps)"""
    m, d = Z.shape
    I = torch.eye(d, device=Z.device)
    cov = (d / (m * eps ** 2)) * (Z.T @ Z)
    return 0.5 * torch.logdet(I + cov)
```
