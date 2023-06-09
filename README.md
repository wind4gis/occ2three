# 思路

使用Open cascade去解析step文件，将模型文件拆解为最基础的点线面信息，然后交给Three.js进行展示。相等于从step顶层模型解析到底层拓扑信息，然后交由Three.js重新构建顶层模型的流程。

# 概念解析

## 3D文件格式简介

### 3D文件格式

最初的 3D 格式只是通过曲线和三角面记录了物体的形状，接着人们也希望能够存储物体的外表信息：这个物体是什么颜色的，触感怎么样，透明吗？于是就先后有了颜色、贴图和材质的概念。

### STL文件是什么

STL文件是3D对象的标准格式，特别是对于3D打印。它们的名称代表“立体光刻”，有时也被称为“标准镶嵌语言”和“标准三角测量语言”。此文件类型通过细分对象来表示对象，这意味着创建小三角形形状的网格。

### STEP文件是什么

相比之下，代表“产品模型数据交换标准”的 STEP 是一种常用于 3D 模型的 CAD 文件格式。顾名思义，STEP 文件可从一个 CAD 程序转移到另一个 CAD 程序，无需任何中间转换步骤。

两者对比

为了使它更容易理解，让我们将其与2D图像进行比较。STL文件可以与光栅文件（如JPG）进行比较，光栅文件由具有某些颜色和位置的像素组成，以构成图像。光栅图像可以用于显示目的，但增加图像的大小只会导致像素变大，使其看起来有颗粒感。另一方面，STEP 文件更类似于 SVG 等矢量文件。矢量文件是构成图像的一组数学属性，在不损失质量并保持所有内容正确比例的情况下修改此类文件要容易得多。

STEP 文件提供了类似的优势。它们不仅可以存储网格文件等外部几何体，还可以区分实体对象、空心对象和表面对象（如板材）。此外，STEP文件可以存储有关对象的材料（例如，钢），约束（例如，面保持平行），厚度，尺寸等的信息。如果您在 SolidWorks 中将直径为 5 mm 的实心铝球创建为 STEP 文件并在 AutoCAD 中打开它，则新程序仍然知道有关该球的所有数据。

STEP 文件与 STL 文件在本质上是不同的：前者是带有参数的实体对象，而后者本质上是网格，因此您首先需要对现有网格进行修改，使其成为实体。

STEP文件和STL文件是两种最常见的文件格式，但它们都有自己的特征。STL文件仅描述模型的外部几何形状，并将其特征简化为由三角形组成的网格，没有间隙和重叠，但STEP文件将模型保存为单个实体并使用NURBS，允许更高的尺寸精度和更平滑的曲线。因此，STL 文件比 STEP 文件更轻、更简单、存储效率更高。

## Three.JS概念简介

### WebGL

- WebGL是一种 JavaScript API 或可编程接口，用于在网页中绘制交互式 2D 和 3D 图形。WebGL 将您的 Web 浏览器连接到您设备的图形卡，为您提供比传统网站更强大的图形处理能力

- three.js 使用 WebGL 来显示 3D 图形，但它也可以用于 2D 图形，甚至是 GPGPU（通用 GPU）计算

### Render

- *首先渲染器*`*Renderer*`*，它就像一个动态变化的剧院，能够根据导演和演员的需要，为不同的演出提供支持。产品经理的奇妙想法，设计师的脑洞大开UI，通过程序员的手，都能在*`*Renderer*`*中展现出来。*

### Camera

- `Camera`只有一半包含在`Renderer`中，如果不去想这个单词的英文含义，你会觉得它在剧院中属于那一部分呢？我认为他更像一个观众，虽身处剧院之中，却不干预剧情的发展。实际上，`Camera`也确实是这样的一个角色，*它决定了我们能看到什么，用什么方式去看，在什么位置去看。*`*Camera*`*既可以在*`*Renderer*`*中，和其它要素打成一团，也可以脱离*`*Renderer*`*区域，进行远观，就像一个观众，如果允许，可以到台上去看戏，也可以坐在剧院最后一排看戏。*

### Scene

- `Scene`本义就是场景的意思，为了好理解，暂时可以把它当作一个静态的舞台布置，上面可能会布置桌椅板凳灯光等道具。回到`threejs`中，就是`Mesh` ，`Light`,`Group`等。这里对这些布置有个概念就行，重要的是记住`Scene`就是一个静态的场景。

### Mesh

- `*Mesh*`*是由*`*Geometry*`*和*`*Material*`*组成的物体；而在树上基于*`*Mesh*`*的其它节点，不过是更复杂的物体，本质和*`*Mesh*`*一样。*

### Geometry

- `Geometry`和它自身的意思一样，就是代表一些不同的几何体，比如球，树，狗，猫等。

### Material

- `Material`代表着几何体的材质，不同的材质有不同的属性，比如沙子和铁就是不一样的。当然，除了材料本身的属性，一些立方体的属性也可以认为改变，比如你家房子的墙壁，并不是混凝土的颜色，而是被装修的五花八门，至少也得有层贴纸。可以看到`Material`的末尾还有一个小尾巴`Texture`就是用来做这事的。

### OrbitControls

- OrbitControls是THREEJS中最常用的一个控制器，可以帮助我们实现以目标为焦点的旋转缩放，同时平移相机观察场景的操作，看上去是物体在进行变换，实际上所有的变化都是相机的相对位置在发生改变。

## OpenCascade Api解析

### StepControl_Reader

- 读取 STEP 文件，检查它们并将其内容转换为 Open CASCADE 模型。

### BRepMesh_IncrementalMesh

- 根据正确三角化的部分构建形状的网格。
- 在OpenCASCADE中网格剖分功能是很重要的一个模块，他可用于生成模型的可视化数据，还可用于HLR消隐，对于离散求交算法也是基于网格数据。OpenCASCADE开源版本中的模块TKMesh可以用来生成网格的显示数据，主要的类为BRepMesh_IncrementalMesh。

### TopOpeBRepTool_ShapeExplorer

- 通过对当前项的索引进行计数来扩展TopExp_Explorer（用于跟踪和调试）

### TopExp_Explorer

- 资源管理器是访问 TopoDS 包中的拓扑数据结构的工具。用于从拓扑对象获取拓扑对象的子元素对象
- Explorer 构建有：
  -  要探索的形状。
  - 要查找的形状类型：例如 VERTEX、EDGE。此类型不能是 SHAPE。
  - 要避免的形状类型。例如 SHELL、EDGE。
- 默认情况下，此类型为 SHAPE，这意味着对探索没有限制。资源管理器访问所有结构以查找所请求类型的形状，这些形状不包含在要避免的类型中。

### TopAbs_ShapeEnum

- *TopAbs_ShapeEnum是一个特殊的结构，类似于一个拓扑结构的数组，具有More()、Next()、Current()三个重要的方法，一般称之为拓扑解析结果集。*

- 标识各种拓扑形状。此枚举允许您使用形状的动态键入。这些值按复杂程度的顺序列出，从最复杂到最简单的，即复合>复合固体>固体>......>顶点>形状。任何形状都可以在其定义中包含更简单的形状。抽象拓扑数据结构描述了一个基本实体，形状（在此枚举中作为 SHAPE 值存在），它可以分为以下组件拓扑：

### BRep_Tool.Triangulation

- 为一个曲面、一组曲面或更一般的形状提供三角测量。三角测量由实际形状的近似表示组成，使用点和三角形的集合。这些点位于表面上。三角形的边用一条近似于曲面上真实曲线的直线连接相邻点。三角测量包括：

### NbNodes

- 返回此多边形的节点数。注： 如果多边形已闭合，则在其节点表的末尾重复闭合点。因此，在闭合三角形上，函数 NbNode 返回 4。

### TColgp

- 创建几何对象之前，根据你是将几何对象用于二维还是三维来确定。若你需要一个几何对象集而不是单一的几何对象，即用来处理一类几何元素，包***TColgp\***就是提供这种功能的。

  ***Package TColgp\***提供类如：***XY, XYZ, Pnt, Pnt2d, Vec, Vec2d, Lin, Lin2D, Circ, Circ2d\***的***TCollection\***的实例。

### 法线-Normal

- 让我们从一个多边形的中心画一条线，完全垂直于它的表面。我们将这一条线称为一个令人困惑的名字：法线。该法线的目的是控制曲面指向的位置，以便当光线从该曲面反弹时，它将使用该法线计算产生的反弹。当光线击中多边形时，我们比较光线与多边形法线的角度。光线将使用与法线方向相同的角度反弹回来：
- 换句话说，光线反弹相对于多边形法线来说是对称的。这就是大多数反弹在现实世界中的工作方式。默认情况下，所有多边形都会反射完全垂直于其曲面的光线（就像在现实生活中那样），因为默认情况下，多边形法线是；垂直于多边形表面。如果法线中有间隙，我们会将它们视为单独的曲面，因为光线会在一个方向或另一个方向上反弹。
- 现在，如果我们有两个连接的面，我们可以告诉计算机平滑一个多边形法线到另一个多边形法线之间的过渡，使法线逐渐与最近的多边形法线对齐。这样，当光线直接击中一个多边形的中心时，光线将沿着法线方向直线反弹。但是在面之间，法线方向是平滑的，弯曲了光的反弹方式。
- 我们将把过渡视为一个单一的表面，因为光线将以平滑的方式从一个多边形反弹到另一个多边形，并且不会有间隙。实际上，光线从这些多边形平滑反弹，效果就会像它有大量多边形时一样。

### IFSelect

- 提供工具来管理选择由接口处理的一组实体，例如将原始模型（从文件）划分为几个较小的模型 他们使用接口模型的描述作为图形。请注意，这对应于共享文件的“场景”的描述。此方案的某些部分旨在永久存储。IFSelect 提供瞬态、活动对应项（用于运行场景）。但是必须在其他地方提供永久的（作为持久对象或可解释的文本）。

### IFSelect_ReturnStatus

- 限定执行状态：RetVoid：正常执行，未创建任何内容，或者没有要处理的数据 RetDone：正常执行并有结果 RetError ：命令或输入数据错误，无执行 RetFail ：执行已运行但失败 RetStop ：表示结束或停止（例如 Raise）

### gp_Pnt

- 构建笛卡尔坐标系

### GC_MakeArcOfCircle

- 实现 3D 空间中圆弧的构造算法。结果是一条Geom_TrimmedCurve曲线。

### GC_MakeSegment

- 实现 3D 空间中线段的构造算法。从 2 个点和 .结果是一条Geom_TrimmedCurve曲线。

### BRepBuilderAPI_MakeWire

- 描述从边缘构建导线的函数。电线可以由任意数量的边构建。要构建导线，首先初始化构造，然后按顺序添加边。可以添加无限数量的边。

## OpenCascade概念解析

### TopoDs和BRep的区别

#### TopoDS中的Shape与TShape

TopoDS包中定义了两套Shape，一套是常规的Shape，而另外一套是TShape*。一般用户是不需要直接操作TShape的，Shape其实是对TShape的一次封装，它给TShape提供了方向和位姿属性。也就是说，TShape只管几何体的外形，而Shape还要负责描述几何体在空间的位置和方向。*TopoDS包中的代码为我们构建了一层抽象的拓扑几何关系。它定义了点，线，面和体的关系。

#### BRep对TShape的进一步具体化

前面提到的TopoDS包只描述了抽象的顶点，边和面之间的关系。却没有描述点，线，面与实际几何对象的关系。在BRep包中，就具体的建立了顶点和点，边与曲线，面与曲面之间的关系。例如，在TopoDS中只表达了顶点这个概念，但却没有给顶点定义坐标。而在BRep包中，描述了面是由什么曲面生成的，面的误差是多少，用三角面片表达的数据又是什么样的？

#### 基本的构建和操作方法

构建一个3D实体，实际上就称为了构建一个有效的TopoDS_Shape。上文提到了BRep是TShape的具体化，而TopoDS是对TShape增加位姿和方向的封装。构建一个3D实体从大体上，可以分为两步：1.通过几何元素构建基本的点，边，面。2.通过组合点，边，面，构建拓扑逻辑体。第1步的操作对应着BRep/BRep_Builder.x 文件中的代码，第2步对应着TopoDS/TopoDS_Builder.x文件中的代码。理论上通过这两个文件提供的api，我们已经能够构建任何3D实体。

### 三角剖分-**Triangulation**

三角网格是多边形网格的一种，多边形网格又被称为“Mesh”，是计算机图形学中用于为各种不规则物体建立模型的一种数据结构。现实世界中的物体表面直观上看都是由曲面构成的；而在计算机世界中，由于只能用离散的结构去模拟现实中连续的事物。所以现实世界中的曲面实际上在计算机里是由无数个小的多边形面片去组成的。比如下图的这些模型，在计算机渲染后由肉眼看是十分平滑的曲面，而实际上，计算机内部使用了大量的小三角形片去组成了这样的形状。这样的小面片的集合就被称作Mesh。Mesh既可以由三角形组成，也可以由其他平面形状如四边形，五边形等组成；由于平面多边形实际上也能再细分成三角形。所以，使用全由三角形组成的三角网格（Triangle Mesh）来表示物体表面也是具有一般性的。

虽然曲线、曲面等有精确的方程来表示，但是在在计算机中，只能用离散的方式来逼近。如曲线可用直线段来逼近，而曲面可用多边形或三角形来表示。用多边形网格表示曲面是设计中经常使用的形式，可以根据应用要求选择网格的密度。利用三角形面片表示的曲面在计算机图形学中也称为三角形网格。用三角形网格表示曲面需要解决几个问题：三角形的产生、描述、遍历、简化和压缩等，这些问题都是计算几何研究的范畴，相关问题都可以从中找到答案。
